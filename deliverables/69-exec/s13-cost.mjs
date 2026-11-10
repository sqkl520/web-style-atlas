/* S13 桌面档改动的代价：逐元素列出「谁动了、动多少」。
 * 不做笼统的"像素差异 X%"—— 页高变了就没法整页比像素，必须落到元素上。
 */
import { serve } from './lib-exec.mjs';
import { Browser, sleep } from './pix-lib.mjs';
import { writeFileSync } from 'node:fs';

const srvB = await serve('D:/Web/style/deliverables/69-exec/_before-tree');
const srvA = await serve('D:/Web/style');
const browser = await Browser.launch({ width: 1440, height: 900 });

const SNAP = `(() => {
  const path = (el) => {
    const p = []; let e = el;
    while (e && e !== document.body) {
      let s = e.tagName.toLowerCase();
      if (e.id) s += '#' + e.id; else if (typeof e.className === 'string' && e.className) s += '.' + e.className.trim().split(/\\s+/)[0];
      p.unshift(s); e = e.parentElement;
    }
    return p.join('>');
  };
  const rows = [];
  for (const el of document.querySelectorAll('body *')) {
    if (['SCRIPT','STYLE'].includes(el.tagName)) continue;
    if (el.tagName === 'CODE') continue;
    const r = el.getBoundingClientRect();
    rows.push({ key: path(el), tag: el.tagName, cls: (typeof el.className === 'string' ? el.className : ''),
      x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2),
      mt: getComputedStyle(el).marginTop, fs: getComputedStyle(el).fontSize });
  }
  return rows;
})()`;

async function snap(srv, dir) {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
  await page.setViewport({ width: 1440, height: 900, dsf: 1, mobile: false });
  await page.goto(srv.url(dir), { timeoutMs: 30000, settleMs: 900 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(1600);
  await page.eval(`(async () => { for (const i of document.images) { i.loading='eager'; i.decoding='sync'; } await Promise.all([...document.images].map(i=>i.decode().catch(()=>null))); window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}); await new Promise(r=>setTimeout(r,500)); window.scrollTo({top:0,behavior:'instant'}); await new Promise(r=>setTimeout(r,600)); return true; })()`).catch(() => {});
  await sleep(400);
  const s = await page.eval(SNAP);
  await page.close();
  return s;
}

const before = await snap(srvB, 'S13-blind-debossed-dispatch/index.html');
const after = await snap(srvA, 'prototypes/S13-blind-debossed-dispatch/index.html');

// 按 key 对齐（结构没变，key 应一一对应；S13 HTML 只多了 code 层，已排除）
const bMap = new Map(); for (const r of before) bMap.set(r.key + '#' + (bMap.has(r.key) ? 1 : 0), r);
console.log(`before ${before.length} 元素 / after ${after.length} 元素`);
if (before.length !== after.length) console.log('⚠ 元素数不同（预期：相同，code 已排除）');

// 逐 index 比较（结构顺序一致）
const moved = [], widthChanged = [];
for (let i = 0; i < Math.min(before.length, after.length); i++) {
  const a = before[i], b = after[i];
  if (a.key !== b.key) { console.log(`  ⚠ 第 ${i} 个结构不齐: ${a.key} vs ${b.key}`); continue; }
  const dy = +(b.y - a.y).toFixed(2), dh = +(b.h - a.h).toFixed(2), dw = +(b.w - a.w).toFixed(2);
  if (dy || dh || dw) {
    const rec = { key: a.key, cls: a.cls, dy, dh, dw, x: a.x, w0: a.w, w1: b.w };
    (dw ? widthChanged : moved).push(rec);
  }
}
console.log(`\n宽度变化的元素 ${widthChanged.length} 个（这就是这次改动的直接对象）：`);
for (const r of widthChanged) console.log(`  ${r.w0} → ${r.w1} (Δ${r.dw})  x=${r.x}  ${r.key}`);
console.log(`\n位置/高度变化的元素 ${moved.length} 个（重排的连带）：`);
for (const r of moved.slice(0, 25)) console.log(`  Δy=${r.dy} Δh=${r.dh}  ${r.key}`);
if (moved.length > 25) console.log(`  …另有 ${moved.length - 25} 个`);

writeFileSync('D:/Web/style/deliverables/69-exec/_ab/s13-cost.json', JSON.stringify({ widthChanged, moved }, null, 1), 'utf8');
await browser.close();
srvB.server.close();
srvA.server.close();
