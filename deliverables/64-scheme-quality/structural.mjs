import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/Web/style/prototypes';
const dirs = fs.readdirSync(ROOT).filter(d => /^S\d\d-/.test(d)).sort();

// --- tiny HTML scanner: emits open/close tags in order, ignoring comments/scripts/styles
function tags(html) {
  const out = [];
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '<script></script>')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '<style></style>');
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g;
  let m;
  while ((m = re.exec(stripped))) {
    out.push({ close: m[1] === '/', name: m[2].toLowerCase(), attrs: m[3] || '', self: m[4] === '/' });
  }
  return out;
}
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);

const rows = [];
for (const d of dirs) {
  const html = fs.readFileSync(path.join(ROOT, d, 'index.html'), 'utf8');
  const t = tags(html);
  const opens = t.filter(x => !x.close && !VOID.has(x.name));

  // unclosed / mismatched tags (balanced stack)
  const stack = [];
  let mism = [];
  for (const x of t) {
    if (VOID.has(x.name) || x.self) continue;
    if (!x.close) stack.push(x);
    else {
      const i = stack.map(s => s.name).lastIndexOf(x.name);
      if (i === -1) mism.push('stray </' + x.name + '>');
      else { if (i !== stack.length - 1) mism.push('</' + x.name + '> closes over ' + stack.slice(i + 1).map(s => '<' + s.name + '>').join(',')); stack.length = i; }
    }
  }
  if (stack.length) mism.push('unclosed: ' + stack.map(s => '<' + s.name + '>').join(','));

  // heading order
  const hs = opens.filter(x => /^h[1-6]$/.test(x.name)).map(x => +x.name[1]);
  const orderIssues = [];
  if (hs.length && hs[0] !== 1) orderIssues.push('first heading is h' + hs[0]);
  if (hs.filter(x => x === 1).length !== 1) orderIssues.push(hs.filter(x => x === 1).length + ' h1');
  for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) orderIssues.push(`skip h${hs[i - 1]}→h${hs[i]}`);

  // landmarks
  const has = (n) => opens.filter(x => x.name === n).length;
  const roleMain = (html.match(/role="main"/g) || []).length;
  const roleNav = (html.match(/role="navigation"/g) || []).length;
  const roleBanner = (html.match(/role="banner"/g) || []).length;
  const landmarks = {
    header: has('header'), nav: has('nav'), main: has('main'), footer: has('footer'),
    aside: has('aside'), section: has('section'), article: has('article'),
    roleMain, roleNav, roleBanner
  };

  // a11y attr stats
  const imgTags = (html.match(/<img\b[^>]*>/gi) || []);
  const imgNoAlt = imgTags.filter(x => !/\balt\s*=/.test(x)).length;
  const imgEmptyAlt = imgTags.filter(x => /\balt\s*=\s*(["'])\s*\1/.test(x)).length;
  const inputTags = (html.match(/<(input|select|textarea)\b[^>]*>/gi) || []);
  const inputsUnlabelled = inputTags.filter(x => !/\bid\s*=/.test(x) || true).length; // placeholder
  const labels = (html.match(/<label\b/g) || []).length;
  const ariaLabelledby = (html.match(/aria-labelledby=/g) || []).length;
  const ariaDescribedby = (html.match(/aria-describedby=/g) || []).length;
  const ariaExpanded = (html.match(/aria-expanded=/g) || []).length;
  const ariaControls = (html.match(/aria-controls=/g) || []).length;
  const ariaHidden = (html.match(/aria-hidden="true"/g) || []).length;
  const roleStatus = (html.match(/role="status"/g) || []).length;
  const roleAlert = (html.match(/role="alert"/g) || []).length;
  const tabindex = (html.match(/tabindex=/g) || []).length;
  const buttons = (html.match(/<button\b/gi) || []).length;
  const buttonType = (html.match(/<button\b[^>]*\btype=/gi) || []).length;
  const links = (html.match(/<a\b[^>]*href/gi) || []).length;
  const imagesWithWH = imgTags.filter(x => /\bwidth=/.test(x) && /\bheight=/.test(x)).length;
  const lazyImgs = imgTags.filter(x => /loading="lazy"/.test(x)).length;
  const srcset = (html.match(/srcset=/g) || []).length;
  const picture = (html.match(/<picture\b/gi) || []).length;
  const timeTags = (html.match(/<time\b/gi) || []).length;
  const tables = (html.match(/<table\b/gi) || []).length;
  const thScope = (html.match(/scope="/g) || []).length;
  const captions = (html.match(/<caption\b/gi) || []).length;
  const srOnlyUse = (html.match(/class="[^"]*\bsr-only\b/g) || []).length;
  const skipLink = (html.match(/class="[^"]*\bskip\b[^"]*"[^>]*href="#/g) || []).length;
  const inlineStyle = (html.match(/\sstyle="/g) || []).length;
  const inlineHandlers = (html.match(/\son(click|change|input|load|keydown)=/gi) || []).length;

  // css
  const cssPath = path.join(ROOT, d, 'style.css');
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
  const cssNC = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const focusSel = [...cssNC.matchAll(/([^{}]*):focus[^{]*\{/g)].map(m => m[1].trim().slice(-60));
  const mqBlocks = [...cssNC.matchAll(/@media([^{]+)\{/g)].map(m => m[1].trim());
  const reduced = /@media\s*\(prefers-reduced-motion\s*:\s*reduce\)/.test(cssNC);
  const reducedBlockCount = (cssNC.match(/prefers-reduced-motion\s*:\s*reduce/g) || []).length;
  const animations = (cssNC.match(/animation\s*:/g) || []).length;
  const transitions = (cssNC.match(/transition\s*:/g) || []).length;
  const smoothing = (cssNC.match(/-webkit-font-smoothing/g) || []).length;
  const textRendering = (cssNC.match(/text-rendering\s*:/g) || []).length;

  rows.push({
    dir: d,
    mismatched: mism,
    headingSeq: hs.join(''),
    orderIssues,
    landmarks,
    imgCount: imgTags.length, imgNoAlt, imgEmptyAlt, imagesWithWH, lazyImgs, srcset, picture,
    inputCount: inputTags.length, labels, ariaLabelledby, ariaDescribedby,
    ariaExpanded, ariaControls, ariaHidden, roleStatus, roleAlert, tabindex,
    buttons, buttonType, links,
    timeTags, tables, thScope, captions, srOnlyUse, skipLink,
    inlineStyle, inlineHandlers,
    focusSelectors: focusSel.slice(0, 12),
    focusCount: focusSel.length,
    focusVisible: /:focus-visible/.test(cssNC),
    mqBlocks, reduced, reducedBlockCount, animations, transitions, smoothing, textRendering,
    cssBytes: css.length, htmlBytes: html.length
  });
}
fs.writeFileSync('D:/Web/style/deliverables/64-scheme-quality/structural.json', JSON.stringify(rows, null, 1));
console.log('ok');
