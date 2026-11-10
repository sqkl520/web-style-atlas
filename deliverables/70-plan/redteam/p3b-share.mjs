// 探针 P3b：S28 的「梅子紫 31.6% vs 复刻 0%」这个数字，用五种口径各量一遍。
//
// 「一个色占多少」至少五种合理定义，彼此能差一个数量级：
//   ① DOM 元素框面积（含边框）= 元素外接框面积之和，背景色统计
//   ② DOM 文本覆盖（字号²×字符数）= 近似"墨迹"面积
//   ③ 像素直方图（整页截图，精确色值）
//   ④ 像素直方图（ΔE ≤ 2 视为同色，吸收抗锯齿）
//   ⑤ 规格声称值（S28.md 字段 3 写的 28%）
// 如果不指明口径，「31.6%」这个数字无法被证伪也无法被复现。
//
// 跑法：node deliverables/70-plan/redteam/p3b-share.mjs
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { decodePng } from './lib-png.mjs';

const ROOT = 'D:/Web/style';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  try { res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p)); } catch { res.writeHead(500); res.end(); }
});
await new Promise((r) => server.listen(8645, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });

const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function toLab([r, g, b]) {
  const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  r = lin(r); g = lin(g); b = lin(b);
  let X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, Y = (r * 0.2126 + g * 0.7152 + b * 0.0722), Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  X = f(X); Y = f(Y); Z = f(Z);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
const dE = (a, b) => Math.hypot(...toLab(a).map((v, i) => v - toLab(b)[i]));

async function measure(url, hex) {
  await page.goto(url, { settleMs: 2400 });
  const target = hex2rgb(hex);
  const dom = await page.eval(`(() => {
    const t = ${JSON.stringify(hex)};
    const toHex = (s) => { const m = s && s.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/); if (!m) return null; const h=n=>(+n).toString(16).padStart(2,'0'); return ('#'+h(m[1])+h(m[2])+h(m[3])).toUpperCase(); };
    let boxAll = 0, boxHit = 0, inkAll = 0, inkHit = 0, docH = document.documentElement.scrollHeight;
    for (const el of [document.documentElement, document.body, ...document.querySelectorAll('body *')]) {
      const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
      const box = r.width * r.height;
      const cs = getComputedStyle(el);
      const txt = (el.textContent||'').trim();
      const fs = parseFloat(cs.fontSize) || 0;
      const ink = el.children.length === 0 && txt ? Math.min(box, txt.length * fs * fs * 0.55) : 0;
      boxAll += box; inkAll += ink;
      const bg = toHex(cs.backgroundColor), fg = toHex(cs.color);
      if (bg === t) boxHit += box;
      if (fg === t) inkHit += ink;
    }
    return { boxAll, boxHit, inkAll, inkHit, docH };
  })()`);
  const png = await page.screenshot({ format: 'png', fullPage: true });
  const img = decodePng(Buffer.from(png, 'base64'));
  const ch = img.channels, tot = img.width * img.height;
  let exact = 0, near2 = 0, near5 = 0;
  for (let i = 0; i < tot; i++) {
    const o = i * ch;
    const c = [img.data[o], img.data[o + 1], img.data[o + 2]];
    const d = dE(c, target);
    if (d === 0) exact++;
    if (d <= 2) near2++;
    if (d <= 5) near5++;
  }
  return {
    domBoxBgPct: +((dom.boxHit / dom.boxAll) * 100).toFixed(2),
    domInkFgPct: +((dom.inkHit / (dom.inkAll || 1)) * 100).toFixed(2),
    pxExactPct: +((exact / tot) * 100).toFixed(2),
    pxDE2Pct: +((near2 / tot) * 100).toFixed(2),
    pxDE5Pct: +((near5 / tot) * 100).toFixed(2),
    docH: dom.docH, px: tot,
  };
}

const out = {};
for (const hex of ['#AF74BE', '#0B0D12', '#D8D4C6', '#07080C']) {
  out[hex] = {
    proto: await measure('http://127.0.0.1:8645/prototypes/S28-jazz-intaglio-wall/index.html', hex),
    impl: await measure('http://127.0.0.1:8645/deliverables/69-test/S28/index.html', hex),
  };
}
console.log('S28 配色占比 —— 同一份数据，五种口径\n');
console.log('色        | 口径            | 原型   | 复刻');
for (const [hex, v] of Object.entries(out)) {
  const rows = [['DOM 背景面积', 'domBoxBgPct'], ['DOM 文字覆盖', 'domInkFgPct'], ['像素精确', 'pxExactPct'], ['像素 ΔE≤2', 'pxDE2Pct'], ['像素 ΔE≤5', 'pxDE5Pct']];
  for (const [label, k] of rows) console.log(`${hex} | ${label.padEnd(15)} | ${String(v.proto[k]).padStart(6)} | ${v.impl[k]}`);
  console.log('');
}
console.log('文档声称：S28.md 字段3 = #0B0D12 58% / #AF74BE 28% / #D8D4C6 14%（面积和 100）');
console.log('任务书声称：梅子紫 31.6% vs 复刻 0%');
const p = out['#AF74BE'].proto, i = out['#AF74BE'].impl;
console.log(`\n本探针：#AF74BE 原型 ${p.pxDE2Pct}%（像素 ΔE≤2）/ ${p.domBoxBgPct}%（DOM 背景面积）；复刻 ${i.pxDE2Pct}% / ${i.domBoxBgPct}%`);
console.log(`「复刻 0%」在哪个口径下成立：像素精确=${i.pxExactPct}%，DOM 背景面积=${i.domBoxBgPct}%，DOM 文字覆盖=${i.domInkFgPct}%，像素 ΔE≤2=${i.pxDE2Pct}%`);
writeFileSync(ROOT + '/deliverables/70-plan/redteam/p3b-share.json', JSON.stringify(out, null, 1), 'utf8');
await browser.close();
server.close();
