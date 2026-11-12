/* S99 机制句逐值的**浏览器测量版**（不 grep CSS 文本）。
 *
 * 为什么不能只看 CSS 文本：S99 这一份的 CSS 里 132px / 1×9px / 12px 都写着，
 * 但写着的值和页面上量出来的值可能不是一回事（变量没接上、被后代覆盖、媒体查询改掉）。
 * 本仓库反复记录的病就是「闸门读到的是一个漂亮数字，但量的不是它声称量的东西」。
 *
 * 用法：node deliverables/78-northstar/_probe/_s99-geometry.mjs
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };
const server = createServer(async (req, res) => {
  try {
    const p = resolve(ROOT, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    const buf = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(buf);
  } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage({ width: 1440, height: 900 });
await pg.goto(`http://127.0.0.1:${port}/deliverables/78-northstar/_probe/_S99-out.html`, { settleMs: 1200 });

const out = await pg.eval(`(() => {
  const r1 = (n) => Math.round(n * 10) / 10;
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r1(r.left), y: r1(r.top), w: r1(r.width), h: r1(r.height) }; };
  const wrap = document.querySelector('.wrap');
  const firstBlk = document.querySelector('section.blk');
  const blkDim = document.querySelector('section.blk .blk-dim');
  const blkExt = document.querySelector('section.blk .blk-dim .ext.t');
  const blkTick = document.querySelector('section.blk .blk-dim .tick.t');
  const blkRule = document.querySelector('section.blk .blk-dim .rule');
  const blkRd = document.querySelector('section.blk .blk-dim .rd');
  const totDim = document.querySelector('.tot-dim');
  const segDim = document.querySelector('.seg-dim');
  const totExt = document.querySelector('.tot-dim .ext.t');
  const segExt = document.querySelector('.seg-dim .ext.t');
  const h1 = document.querySelector('h1');
  /* ⚠️ 不能量 .dim 容器：它是 width:0 的定位盒，三级链的偏移落在**里面的 .rule/.tick** 上。
   * 上一版量容器，三条链全报 x=212 —— 那是容器的 left，不是链的位置，等于没量。 */
  const levels = [];
  for (const [name, sel] of [['总尺寸链 tot', '.tot-dim .rule'], ['分段链 seg', '.seg-dim .rule'], ['块链 blk', 'section.blk .blk-dim .rule']]) {
    const el = document.querySelector(sel);
    if (el) levels.push({ name, ...rect(el) });
  }
  const ticks = [];
  for (const [name, sel] of [['总尺寸 tick', '.tot-dim .tick.t'], ['分段 tick', '.seg-dim .tick.t'], ['块 tick', 'section.blk .blk-dim .tick.t']]) {
    const el = document.querySelector(sel);
    if (el) ticks.push({ name, ...rect(el) });
  }
  return {
    wrapPadLeft: getComputedStyle(wrap).paddingLeft,
    wrapRect: rect(wrap),
    firstBlkRect: rect(firstBlk),
    gutterPx: r1(firstBlk.getBoundingClientRect().left - wrap.getBoundingClientRect().left),
    blkChain: {
      ext: blkExt ? rect(blkExt) : null,
      tick: blkTick ? rect(blkTick) : null,
      rule: blkRule ? rect(blkRule) : null,
      rd: blkRd ? rect(blkRd) : null,
    },
    totExt: totExt ? rect(totExt) : null,
    segExt: segExt ? rect(segExt) : null,
    levels,
    ticks,
    h1: h1 ? { font: getComputedStyle(h1).fontSize, rect: rect(h1), family: getComputedStyle(h1).fontFamily } : null,
    body: { font: getComputedStyle(document.body).fontSize, lh: getComputedStyle(document.body).lineHeight, family: getComputedStyle(document.body).fontFamily },
    gridTracksOfCaps: (() => {
      const c = document.querySelector('.caps');
      return c ? getComputedStyle(c).gridTemplateColumns : null;
    })(),
    allBorderWidths: [...new Set([...document.querySelectorAll('*')].flatMap((el) => {
      const cs = getComputedStyle(el);
      return [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth, cs.outlineWidth];
    }).filter((v) => v && v !== '0px'))].sort(),
    radii: [...new Set([...document.querySelectorAll('*')].map((el) => getComputedStyle(el).borderRadius))],
    shadows: [...new Set([...document.querySelectorAll('*')].map((el) => getComputedStyle(el).boxShadow))].filter((v) => v && v !== 'none'),
  };
})()`);

console.log('=== 尺寸链的几何（浏览器实测） ===');
console.log(`  .wrap padding-left = ${out.wrapPadLeft}   （机制句：左侧 132px 空白）`);
console.log(`  首块相对 .wrap 的左边距 = ${out.gutterPx}px`);
console.log('\n  三级链的实际位置（左缘 x）——机制句要求：总在外侧、分段按 18px 逐级内移');
for (const l of out.levels) console.log(`    ${l.name.padEnd(16)} x=${l.x}px  y=${l.y}px  h=${l.h}px  w=${l.w}px`);
if (out.levels.length >= 3) {
  const [a, b, c] = out.levels;
  console.log(`    → 总尺寸与分段之差 = ${b.x - a.x}px（机制句 18px）`);
  console.log(`    → 分段与块链之差   = ${c.x - b.x}px（机制句 18px）`);
}
console.log('  端点短线的位置：');
for (const t of out.ticks) console.log(`    ${t.name.padEnd(14)} x=${t.x}px  ${t.w}×${t.h}px`);

console.log('\n=== 构件尺寸（块级那一套，不是总尺寸那一套） ===');
const bc = out.blkChain;
console.log(`  延长线 ext : ${bc.ext ? bc.ext.w + '×' + bc.ext.h + 'px' : '缺失'}   （机制句 6px 横向）`);
console.log(`  端点短线 tick: ${bc.tick ? bc.tick.w + '×' + bc.tick.h + 'px' : '缺失'}   （机制句 1×9px）`);
console.log(`  尺寸线 rule: ${bc.rule ? bc.rule.w + '×' + bc.rule.h + 'px' : '缺失'}   （机制句 1px）`);
console.log(`  断口 rd    : ${bc.rd ? bc.rd.w + '×' + bc.rd.h + 'px' : '缺失'}   （机制句 12px 宽）`);
console.log(`  总尺寸延长线: ${out.totExt ? out.totExt.w + '×' + out.totExt.h + 'px' : '-'}；分段: ${out.segExt ? out.segExt.w + '×' + out.segExt.h + 'px' : '-'}`);

console.log('\n=== 字号 / 字体 ===');
console.log(`  h1: ${out.h1.font} / ${out.h1.family}`);
console.log(`  body: ${out.body.font} / 行高 ${out.body.lh} / ${out.body.family}`);
console.log(`  比 = ${(parseFloat(out.h1.font) / parseFloat(out.body.font)).toFixed(2)}   （机制句 6.2）`);

console.log('\n=== 纪律项 ===');
console.log(`  所有出现过的线宽: ${out.allBorderWidths.join(' / ')}`);
console.log(`  圆角取值集合: ${out.radii.join(' / ')}`);
console.log(`  box-shadow 非 none 的元素数: ${out.shadows.length}`);
console.log(`  .caps 的 grid 轨道: ${out.gridTracksOfCaps}`);

await browser.close();
server.close();
process.exit(0);
