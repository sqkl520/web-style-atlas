// 探针 P3/P4：相似度这个指标本身可不可信 + S28 的配比到底是多少。
//
// P4 的核心质疑是「循环论证」：如果 0.490 主要由「字号分布余弦相似度」贡献，
// 那么「补字号」当然会把它推高 —— 但那只证明指标对字号敏感，不证明页面更像。
// 检验一个相似度指标是否有效的标准做法是**判别力测试**：把毫不相干的两个案子
// 喂给它，如果分数与「同一个案子的复刻 vs 原型」接近，这个指标就没有判别力，
// 0.490 也就不能被解释成「像 49%」。
//
// 因此本探针算三类配对：
//   A. 原型 vs 自己的复刻（跨案基准：应该最高）
//   B. 原型 vs 另一个原型（无关配对：应该显著低）
//   C. 原型 vs 自己的复刻，但把复刻的字号整体乘 k（1.5 / 2.0）——直接测「只改字号」
//      能不能把分数推上去，而不改变任何版面
//
// 同时按 LEAD-similarity.mjs 的**原样算法**（body *，叶子节点，元素框面积加权，
// 余弦相似度）重算一遍，确保复现 0.490。
//
// 跑法：node deliverables/70-plan/redteam/p3p4-similarity-probe.mjs
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'D:/Web/style';
const OUT = join(ROOT, 'deliverables/70-plan/redteam');
mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.webp': 'image/webp' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = join(ROOT, u);
  if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  try { res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p)); }
  catch { res.writeHead(500); res.end('err'); }
});
await new Promise((r) => server.listen(8644, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });

// ── 与 LEAD-similarity.mjs 逐字等价的指纹函数 ─────────────────────────
async function fingerprint(url, { fontSizeScale = 1, extraCss = '' } = {}) {
  await page.goto(url, { settleMs: 2200 });
  if (fontSizeScale !== 1 || extraCss) {
    await page.eval(`(() => {
      ${extraCss ? `const st=document.createElement('style'); st.textContent=${JSON.stringify(extraCss)}; document.head.appendChild(st);` : ''}
      ${fontSizeScale !== 1 ? `
      const all=[document.documentElement,...document.querySelectorAll('body *')];
      const base=all.map(e=>parseFloat(getComputedStyle(e).fontSize)||16);
      all.forEach((e,i)=>{ if(e.style) e.style.setProperty('font-size', (base[i]*${fontSizeScale})+'px', 'important'); });
      ` : ''}
    })()`);
    await new Promise((r) => setTimeout(r, 400));
  }
  return page.eval(`(() => {
    const toHex = (s) => { const m = s && s.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/); if (!m) return null; const h=n=>(+n).toString(16).padStart(2,'0'); return ('#'+h(m[1])+h(m[2])+h(m[3])).toUpperCase(); };
    const colorArea = {}, sizeArea = {}, famArea = {};
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const a = r.width * r.height;
      const cs = getComputedStyle(el);
      const bg = toHex(cs.backgroundColor);
      if (bg && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') colorArea[bg] = (colorArea[bg]||0) + a;
      if (el.children.length === 0 && (el.textContent||'').trim()) {
        const fs = Math.round(parseFloat(cs.fontSize));
        sizeArea[fs] = (sizeArea[fs]||0) + a;
        const fam = cs.fontFamily.split(',')[0].replace(/["']/g,'').trim();
        famArea[fam] = (famArea[fam]||0) + a;
      }
    }
    const norm = (o) => { const t = Object.values(o).reduce((a,b)=>a+b,0) || 1; const r = {}; for (const [k,v] of Object.entries(o)) r[k] = +(v/t*100).toFixed(1); return r; };
    return { colors: norm(colorArea), sizes: norm(sizeArea), fams: norm(famArea) };
  })()`);
}
function cosine(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, na = 0, nb = 0;
  for (const k of keys) { const x = a[k] || 0, y = b[k] || 0; dot += x*y; na += x*x; nb += y*y; }
  return na && nb ? +(dot / Math.sqrt(na*nb)).toFixed(3) : 0;
}
const overall = (p, q) => {
  const c = cosine(p.colors, q.colors), s = cosine(p.sizes, q.sizes), f = cosine(p.fams, q.fams);
  return { color: c, size: s, fam: f, overall: +((c + s + f) / 3).toFixed(3) };
};

const CASES = [['S20', 'S20-plotter-soundfield'], ['S21', 'S21-interlocking-release-book'], ['S28', 'S28-jazz-intaglio-wall']];
const PROTO = {};
for (const [id, dir] of CASES) PROTO[id] = await fingerprint(`http://127.0.0.1:8644/prototypes/${dir}/index.html`);
const IMPL = {};
for (const [id] of CASES) IMPL[id] = await fingerprint(`http://127.0.0.1:8644/deliverables/69-test/${id}/index.html`);

const rows = [];
console.log('=== A. 原型 vs 自己的复刻（复现 LEAD 的 0.490）===');
const baseScores = [];
for (const [id] of CASES) {
  const r = overall(PROTO[id], IMPL[id]);
  baseScores.push(r.overall);
  rows.push({ kind: 'A', a: id + '(原型)', b: id + '(复刻)', ...r });
  console.log(`  ${id}: 综合 ${r.overall}（色 ${r.color} / 字号 ${r.size} / 字体 ${r.fam}）`);
}
console.log('  平均 = ' + (baseScores.reduce((a, b) => a + b, 0) / 3).toFixed(3) + '   ← 应与 LEAD 的 0.490 一致');

console.log('\n=== B. 判别力：原型 vs **另一个**原型（毫不相干的两套设计）===');
const cross = [];
for (const [a] of CASES) for (const [b] of CASES) {
  if (a >= b) continue;
  const r = overall(PROTO[a], PROTO[b]);
  cross.push(r.overall);
  rows.push({ kind: 'B', a: a + '(原型)', b: b + '(原型)', ...r });
  console.log(`  ${a} vs ${b}: 综合 ${r.overall}（色 ${r.color} / 字号 ${r.size} / 字体 ${r.fam}）`);
}
console.log('  平均 = ' + (cross.reduce((a, b) => a + b, 0) / cross.length).toFixed(3));

console.log('\n=== C. 只把复刻的字号放大 k 倍（版面一个像素都不动）===');
for (const k of [1.5, 2.0]) {
  for (const [id] of CASES) {
    const impl2 = await fingerprint(`http://127.0.0.1:8644/deliverables/69-test/${id}/index.html`, { fontSizeScale: k });
    const r = overall(PROTO[id], impl2);
    rows.push({ kind: 'C×' + k, a: id + '(原型)', b: id + `(复刻字号×${k})`, ...r });
    console.log(`  ${id} 字号×${k}: 综合 ${r.overall}（色 ${r.color} / 字号 ${r.size} / 字体 ${r.fam}）  字号分项 ${cosine(PROTO[id].sizes, IMPL[id].sizes)} → ${r.size}`);
  }
}

// ── S28 配比：把「面积占比」用两种口径量 ────────────────────────────
console.log('\n=== P3：S28 配比 —— 规格声称 #AF74BE 占 28%，实测多少 ===');
async function shareOf(url, hex) {
  await page.goto(url, { settleMs: 2200 });
  const dom = await page.eval(`(() => {
    const t = ${JSON.stringify(hex)};
    const toHex = (s) => { const m = s && s.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/); if (!m) return null; const h=n=>(+n).toString(16).padStart(2,'0'); return ('#'+h(m[1])+h(m[2])+h(m[3])).toUpperCase(); };
    let area = 0, total = 0, n = 0;
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
      const a = r.width * r.height; total += a;
      const cs = getComputedStyle(el);
      const cols = [cs.backgroundColor, cs.color, cs.borderTopColor, cs.borderBottomColor, cs.fill, cs.stroke].map(toHex);
      if (cols.includes(t)) { area += a; n++; }
    }
    return { areaPct: +(area/total*100).toFixed(2), n, total: Math.round(total) };
  })()`);
  // 像素口径：截图上该色的像素占比（整页，含文字抗锯齿不计）
  const png = await page.screenshot({ format: 'png', fullPage: true });
  const { decodePng } = await import('./lib-png.mjs');
  const img = decodePng(Buffer.from(png, 'base64'));
  const ch = img.channels, tot = img.width * img.height;
  let hit = 0;
  const [R, G, B] = [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
  for (let i = 0; i < tot; i++) { const o = i*ch; if (Math.abs(img.data[o]-R)<=2 && Math.abs(img.data[o+1]-G)<=2 && Math.abs(img.data[o+2]-B)<=2) hit++; }
  return { ...dom, pxPct: +(hit/tot*100).toFixed(2) };
}
const s28proto = await shareOf('http://127.0.0.1:8644/prototypes/S28-jazz-intaglio-wall/index.html', '#AF74BE');
const s28impl = await shareOf('http://127.0.0.1:8644/deliverables/69-test/S28/index.html', '#AF74BE');
const s28implInk = await shareOf('http://127.0.0.1:8644/deliverables/69-test/S28/index.html', '#0B0D12');
const s28protoInk = await shareOf('http://127.0.0.1:8644/prototypes/S28-jazz-intaglio-wall/index.html', '#0B0D12');
console.log(`  原型 #AF74BE: DOM面积占比 ${s28proto.areaPct}% / 像素占比 ${s28proto.pxPct}%  (n=${s28proto.n})`);
console.log(`  复刻 #AF74BE: DOM面积占比 ${s28impl.areaPct}% / 像素占比 ${s28impl.pxPct}%  (n=${s28impl.n})`);
console.log(`  规格声称主色 28%（S28.md 字段3）、底色 #0B0D12 声称 58%`);
console.log(`  原型 #0B0D12: DOM ${s28protoInk.areaPct}% / 像素 ${s28protoInk.pxPct}% ; 复刻 #0B0D12: DOM ${s28implInk.areaPct}% / 像素 ${s28implInk.pxPct}%`);

writeFileSync(join(OUT, 'p3p4-similarity.json'), JSON.stringify({ rows, s28: { proto: s28proto, impl: s28impl, protoInk: s28protoInk, implInk: s28implInk } }, null, 1), 'utf8');
await browser.close();
server.close();
