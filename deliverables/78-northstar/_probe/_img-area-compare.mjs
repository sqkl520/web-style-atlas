#!/usr/bin/env node
/* 图片位面积对照：产物 vs 原型，用真浏览器量 getBoundingClientRect。
 *
 * 【为什么需要】
 *
 * `score.mjs` 的 ④ 图片判据数的是**源码里 <img> 标签的个数**。
 * 实测 S21 有 6 个 <img>，判据报「图片 6/5 达标 ✓」——
 * 但渲染出来那 6 个盒子是 120×100 / 96×100 / 142×100 …，
 * 而原型对应位置是 909×342 的通栏大图。**面积差 19 倍**。
 *
 * 数量对、面积完全不对，而源码层看不见这件事。
 *
 * 【判据】
 *
 * 对每个案：产物所有 <img> 盒面积之和 / 原型所有 <img> 盒面积之和。
 * 比值接近 1 说明"图片占的版面份额"复刻对了。
 *
 * 已知的合理偏差（必须写出来）：
 *   · 产物用占位路径（images/占位-N.jpg 不存在）→ naturalWidth=0，
 *     但 CSS 给了宽高，盒子面积仍可量。所以这里量的是**盒子**，不是图片像素。
 *   · 原型按完整文案排，产物按 have=5 排 → 页高不同，绝对面积不可直接比。
 *     所以用**比值**而不是绝对值，并且同时报页高比，让读者能看到偏差来源。
 *
 * 只报不判：阈值取决于每个案的设计意图，先看分布再定线。
 */
import { readFileSync, existsSync } from 'node:fs';
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const W = {};
new Function('window', readFileSync(ROOT + '/prototypes/_selection/data.js', 'utf8'))(W);

const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css;charset=utf-8', '.js': 'text/javascript;charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

function serve(root) {
  return new Promise((res) => {
    const s = createServer(async (req, rq) => {
      try {
        const p = join(root, decodeURIComponent(req.url.split('?')[0]));
        const buf = await readFile(p);
        rq.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
        rq.end(buf);
      } catch { rq.writeHead(404); rq.end(); }
    });
    s.listen(0, '127.0.0.1', () => res({ s, port: s.address().port }));
  });
}

async function measure(browser, url) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url, { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 900));
    return await page.eval(`(() => {
      const imgs = [...document.querySelectorAll('img')];
      const boxes = imgs.map(i => { const b = i.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; });
      const area = boxes.reduce((a,b)=>a+b.w*b.h, 0);
      return { n: imgs.length, area, docH: document.documentElement.scrollHeight };
    })()`);
  } finally { await page.close().catch(() => {}); }
}

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = [];
try {
  const bt = await serve(join(ROOT, 'deliverables/78-northstar/_blindtest'));
  const pt = await serve(ROOT);
  const ids = W.SCHEMES.map((s) => s.id);
  for (const id of ids) {
    const aDir = join(ROOT, 'deliverables/78-northstar/_blindtest', id);
    if (!existsSync(join(aDir, 'index.html'))) continue;
    const sc = W.SCHEMES.find((x) => x.id === id);
    const protoPath = join(ROOT, 'prototypes', sc.dir, 'index.html');
    if (!existsSync(protoPath)) continue;
    let a, p;
    try { a = await measure(browser, `http://127.0.0.1:${bt.port}/${id}/index.html`); } catch (e) { a = { err: String(e).slice(0, 60) }; }
    try { p = await measure(browser, `http://127.0.0.1:${pt.port}/prototypes/${sc.dir}/index.html`); } catch (e) { p = { err: String(e).slice(0, 60) }; }
    out.push({ id, art: a, proto: p });
  }
  await new Promise((r) => bt.s.close(r));
  await new Promise((r) => pt.s.close(r));
} finally { await browser.close().catch(() => {}); }

console.log('图片位面积：产物 vs 原型（真浏览器，1440×900）\n');
console.log('案     产物 n/面积      原型 n/面积      面积比   页高比  图占版面比(产/原)');
for (const r of out) {
  if (r.art.err || r.proto.err) { console.log(`${r.id.padEnd(6)} 渲染失败`); continue; }
  const ratio = r.proto.area ? (r.art.area / r.proto.area) : null;
  const hRatio = r.proto.docH ? (r.art.docH / r.proto.docH) : null;
  /* ⚠️ 归一化：图片面积占"页面总面积"的比例。
   *
   * 绝对面积比会被页高差污染 —— 产物按 have=5 排、原型按完整文案排，
   * 页高比 0.10–0.58，所以绝对面积小不能直接归因于"图小了"。
   *
   * 归一化后：图片占本页版面的**份额**。这个份额若接近 1，
   * 说明"图在这个页面里的重要性"复刻对了，只是整体页短。
   * 若份额差很多，才是真的"图被压小了"。 */
  const artShare = r.art.docH ? r.art.area / (1440 * r.art.docH) : null;
  const proShare = r.proto.docH ? r.proto.area / (1440 * r.proto.docH) : null;
  const shareRatio = (artShare != null && proShare) ? artShare / proShare : null;
  const mark = shareRatio == null ? '  -  '
    : shareRatio < 0.4 ? ' ←份额严重偏低'
    : shareRatio < 0.7 ? ' ←份额偏小'
    : '';
  console.log(
    `${r.id.padEnd(6)}${String(r.art.n).padStart(2)}/${String(r.art.area).padEnd(9)}` +
    `${String(r.proto.n).padStart(2)}/${String(r.proto.area).padEnd(9)}` +
    `${ratio == null ? '  -  ' : ratio.toFixed(2) + '×'}    ${hRatio == null ? '-' : hRatio.toFixed(2) + '×'}   ` +
    `${shareRatio == null ? '-' : shareRatio.toFixed(2) + '×'}${mark}`
  );
}
const valid = out.filter((r) => !r.art.err && !r.proto.err && r.proto.area && r.proto.docH);
const sevShare = valid.filter((r) => {
  const a = r.art.area / (1440 * r.art.docH), p = r.proto.area / (1440 * r.proto.docH);
  return p && a / p < 0.4;
}).length;
console.log(`\n${valid.length} 案可量`);
console.log(`  绝对面积不到原型 25% 的：${valid.filter((r) => r.art.area / r.proto.area < 0.25).length} 案`);
console.log(`  **归一化后份额仍不到原型 40% 的：${sevShare} 案** ← 这才是"图真的被压小了"`);
console.log('（只报不判。归一化用「图片面积 / (1440 × 页高)」，剔除页高差的影响。）');
