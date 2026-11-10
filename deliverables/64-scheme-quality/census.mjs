import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/Web/style/prototypes';
const dirs = fs.readdirSync(ROOT).filter(d => /^S\d\d-/.test(d)).sort();

function walk(d) {
  let out = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else out.push(p);
  }
  return out;
}

const rows = [];
for (const d of dirs) {
  const dir = path.join(ROOT, d);
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const cssPath = path.join(dir, 'style.css');
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
  const assetsDir = path.join(dir, 'assets');
  const assets = fs.existsSync(assetsDir) ? walk(assetsDir) : [];
  const inspectDir = path.join(dir, '.inspect');
  const inspect = fs.existsSync(inspectDir) ? fs.readdirSync(inspectDir) : [];

  const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const cssRules = (cssNoComments.match(/\{/g) || []).length;
  const rootProps = (cssNoComments.match(/--[a-zA-Z0-9_-]+\s*:/g) || []).length;
  const rootBlock = (cssNoComments.match(/:root\s*\{([\s\S]*?)\}/) || [])[1] || '';
  const rootVarNames = new Set((rootBlock.match(/--[a-zA-Z0-9_-]+/g) || []));
  const mq = (cssNoComments.match(/@media[^{]+/g) || []).length;
  const fontFace = (cssNoComments.match(/@font-face/g) || []).length;
  const keyframes = (cssNoComments.match(/@keyframes/g) || []).length;

  const fontURLs = [];
  for (const blk of (cssNoComments.match(/@font-face[\s\S]*?\}/g) || [])) {
    const m = blk.match(/url\(\s*["']?([^"')]+)["']?\s*\)/);
    if (m) fontURLs.push(m[1]);
  }
  const remoteFonts = fontURLs.filter(u => /^https?:/.test(u));
  const localFonts = fontURLs.filter(u => !/^https?:/.test(u));

  const hCount = {};
  for (const h of ['h1','h2','h3','h4','h5','h6'])
    hCount[h] = (html.match(new RegExp('<' + h + '[\\s>]', 'gi')) || []).length;

  const lmCount = {};
  for (const t of ['header','nav','main','footer','aside','section','article','figure','figcaption','ul','ol','li','table','button','a','form','label','details','summary','time'])
    lmCount[t] = (html.match(new RegExp('<' + t + '[\\s>]', 'gi')) || []).length;

  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  const imgsNoAlt = imgTags.filter(t => !/\balt\s*=/i.test(t)).length;
  const imgsEmptyAlt = imgTags.filter(t => /\balt\s*=\s*(["'])\s*\1/i.test(t)).length;

  const httpLinks = [...new Set(html.match(/https?:\/\/[^"'\s>]+/g) || [])];

  rows.push({
    dir: d,
    htmlBytes: fs.statSync(path.join(dir, 'index.html')).size,
    cssBytes: cssPath && fs.existsSync(cssPath) ? fs.statSync(cssPath).size : 0,
    htmlLines: html.split('\n').length,
    cssLines: css.split('\n').length,
    cssRules,
    rootProps,
    rootVarNames: rootVarNames.size,
    mq,
    fontFace, remoteFonts: remoteFonts.length, localFonts: localFonts.length,
    keyframes,
    assetsCount: assets.length,
    assetsBytes: assets.reduce((a, p) => a + fs.statSync(p).size, 0),
    assetsExts: [...new Set(assets.map(p => path.extname(p).toLowerCase()))].sort(),
    inspectCount: inspect.length,
    extFontLink: /fonts\.(googleapis|gstatic)\.com/.test(html),
    fontCssLinks: (html.match(/<link[^>]+_fonts[^>]*>/g) || []).length,
    inlineStyle: (html.match(/\sstyle\s*=\s*"/gi) || []).length,
    scriptTags: (html.match(/<script\b[^>]*>/gi) || []).length,
    scriptSrc: (html.match(/<script[^>]+src="([^"]+)"/gi) || []),
    hCount,
    lmCount,
    imgCount: imgTags.length,
    imgsNoAlt,
    imgsEmptyAlt,
    reducedMotion: /prefers-reduced-motion/.test(cssNoComments),
    focusVisible: /:focus-visible/.test(cssNoComments),
    focusAny: /:focus\b/.test(cssNoComments),
    ariaLabel: (html.match(/aria-label\s*=/g) || []).length,
    ariaHidden: (html.match(/aria-hidden\s*=\s*"true"/g) || []).length,
    roleAttrs: (html.match(/\brole\s*=/g) || []).length,
    langAttr: (html.match(/<html[^>]*\blang\s*=/i) || []).length,
    skipLink: /class="skip"/.test(html) || /跳(过|至)/.test(html.slice(0, 1200)),
    srOnly: /\.sr-only/.test(cssNoComments),
    httpLinks: httpLinks.slice(0, 8),
    extraFiles: fs.readdirSync(dir).filter(f => !['index.html', 'style.css', 'assets', '.inspect'].includes(f)),
    hasAssetsDir: fs.existsSync(assetsDir)
  });
}
fs.mkdirSync('D:/Web/style/deliverables/64-scheme-quality', { recursive: true });
fs.writeFileSync('D:/Web/style/deliverables/64-scheme-quality/census.json', JSON.stringify(rows, null, 1));
console.log('rows', rows.length);
