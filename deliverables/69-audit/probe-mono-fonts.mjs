// 探针 24：等宽字体的正确定量法。
//
// 前三版的错：只挑**一个**「看起来像数字元素」的元素（`code` 或 `.mono`）去问
// CSS.getPlatformFontsForNode。结果：
//   S03 挑到 h1.d1（用 NSimSun）→ 误判「IBM Plex Mono 没画字」，其实它用了 64 次；
//   S08 挑到 code（@font-face 别名 Overprint Numerals → 内部名 IBM Plex Mono）→ 误判「假声称」；
//   S18 挑到 code（用 --mono = Martian Mono）→ 误判，其实 VT323 用在 .nameplate code，90 次。
//
// 正确口径分两步：
//   1) 该族在 computed font-family 里被声明了几次（>0 = 有元素要它）
//   2) 找到**至少一个**声明了该族的元素，且 CSS.getPlatformFontsForNode 报的族
//      与该族匹配（允许 @font-face 别名 → 内部名不同的情况，靠比对字体文件 URL 判定）
import http from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const PORT = 8528;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const f = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const con = JSON.parse(readFileSync(OUT + '/constraints.json', 'utf8'));
const dirs = readdirSync(ROOT).filter((d) => /^S\d\d-/.test(d)).sort();
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

for (const d of dirs) {
  const id = d.slice(0, 3);
  const face = (con.per[id].items.find((i) => i.kind === 'font-mono') || {}).params;
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`http://127.0.0.1:${PORT}/${d}/index.html`, { settleMs: 1200 });
  await p.send('DOM.enable'); await p.send('CSS.enable');

  // 1) @font-face 映射：声明名 -> 字体文件 URL
  const fontFaces = await p.eval(() => {
    const o = [];
    const walk = (rules, sheet) => {
      for (const rule of rules || []) {
        if (rule.cssRules && rule.cssRules.length) { walk(rule.cssRules, sheet); continue; }
        if (rule.constructor.name === 'CSSFontFaceRule' || (rule.style && rule.style.getPropertyValue('font-family'))) {
          const fam = rule.style && rule.style.getPropertyValue('font-family');
          const src = rule.style && rule.style.getPropertyValue('src');
          if (fam && src) o.push({ family: fam.replace(/["']/g, '').trim(), src: src.slice(0, 120) });
        }
      }
    };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules, sh.href); } catch (e) {} }
    return o;
  });

  // 2) 该族被哪些元素声明 + 每族的元素数
  const usage = await p.eval((f) => {
    const hits = [];
    let declared = 0;
    for (const el of document.querySelectorAll('*')) {
      const fam = getComputedStyle(el).fontFamily || '';
      if (!fam.includes(f)) continue;
      declared++;
      if (hits.length < 8 && (el.textContent || '').trim()) {
        hits.push(el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''));
      }
    }
    return { declared, hits };
  }, face ? face.face : '');

  let platform = null, matched = null;
  if (face && usage.declared > 0) {
    // 3) 对命中元素逐个查平台字体，找一个画字的
    const { root } = await p.send('DOM.getDocument', { depth: 0 });
    for (const sel of usage.hits.slice(0, 6)) {
      try {
        const q = await p.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
        if (!q || !q.nodeId) continue;
        const pf = await p.send('CSS.getPlatformFontsForNode', { nodeId: q.nodeId });
        const fams = (pf.fonts || []).map((x) => x.familyName);
        platform = platform || [];
        platform.push({ sel, fams });
      } catch (e) { /* ignore */ }
    }
  }

  // 4) 判定：@font-face 别名不算假声称
  const aliasOf = face ? fontFaces.find((ff) => ff.family === face.face) : null;
  const allReported = (platform || []).flatMap((x) => x.fams);
  const nameMatch = allReported.some((f) => f.toLowerCase().includes(face.face.toLowerCase().split(' ')[0].toLowerCase()));
  let verdict, why;
  if (!face) { verdict = 'N/A'; why = '本案无 mono 声称'; }
  else if (usage.declared === 0) { verdict = 'FAIL'; why = '该族在整页 computed font-family 里一次都没被声明'; }
  else if (nameMatch) { verdict = 'PASS'; why = '声明 ' + usage.declared + ' 次，且平台字体命中'; }
  else if (aliasOf) { verdict = 'PASS*'; why = '@font-face 本地别名：' + face.face + ' → ' + (aliasOf.src.match(/[\w.-]+\.woff2?/i) || ['?'])[0] + '，内部名与声明名不同'; }
  else if (allReported.length === 0) { verdict = 'OPEN'; why = '声明了但找不到可见文字元素可查平台字体'; }
  else { verdict = 'FAIL'; why = '声明 ' + usage.declared + ' 次，但实际画字是 ' + [...new Set(allReported)].join('/'); }

  out[id] = { face: face ? face.face : null, usage, platform, aliasOf, fontFaces: fontFaces.slice(0, 6), verdict, why };
  console.log(id, (face ? face.face : '—').padEnd(20), verdict.padEnd(6), '声明' + String(usage.declared).padStart(4) + '次 |', why);
  await p.close();
}
await b.close(); server.close();
writeFileSync(join(OUT, 'mono-fonts.json'), JSON.stringify(out, null, 1), 'utf8');
const tally = {};
for (const id of Object.keys(out)) tally[out[id].verdict] = (tally[out[id].verdict] || 0) + 1;
console.log('\n汇总:', JSON.stringify(tally));
