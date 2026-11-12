/* S99 的读数是不是真的：把页面上每个「行数牌」与它所在那一块的实际高度对账。
 *
 * 为什么必须做这一步：
 *  S99 的机制句要求「读数 = 这一块实际占的行数，正文 24px 一行」。
 *  如果读数是写死的装饰数字，那么六项可测值全中也不能说明模型实现了机制 ——
 *  它可能只实现了「有一条看起来像尺寸链的线，旁边有几个数字」。
 *  这正是负对照要回答的问题的另一面：格式对了，语义是否成立。
 *
 * 判据（每块两件事都要成立）：
 *   1. 读数牌里的数字 == round(块高 / 24)
 *   2. 六块的行数读数互不相同（机制句与风险段都明确要求这一点）
 *
 * 用法：node deliverables/78-northstar/_probe/_s99-readings.mjs
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const TARGET = join(ROOT, 'deliverables/78-northstar/_probe/_S99-out.html');

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };
const server = createServer(async (req, res) => {
  try {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const p = resolve(ROOT, '.' + rel);
    if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    const buf = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(buf);
  } catch {
    if (!res.headersSent) res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage({ width: 1440, height: 900 });
await pg.goto(`http://127.0.0.1:${port}/deliverables/78-northstar/_probe/_S99-out.html`, { settleMs: 1200 });

const out = await pg.eval(`(() => {
  const px = (v) => parseFloat(v) || 0;
  const round1 = (n) => Math.round(n * 10) / 10;
  const blocks = [...document.querySelectorAll('section.blk')].map((sec, i) => {
    const dim = sec.querySelector('.blk-dim .rd b');
    const say = dim ? parseInt(dim.textContent.trim(), 10) : null;
    const r = sec.getBoundingClientRect();
    const cs = getComputedStyle(sec);
    const h = r.height;
    return {
      idx: i + 1,
      cls: sec.className,
      readout: say,
      heightPx: round1(h),
      marginTop: px(cs.marginTop), marginBottom: px(cs.marginBottom),
      linesBy24: Math.round(h / 24),
      linesByBodyLH: Math.round(h / (px(cs.lineHeight) || 24)),
      lineHeightPx: px(cs.lineHeight),
    };
  });
  /* 尺寸链的三个几何量：栏宽、端点短线、断口 */
  const chain = document.querySelector('.tot-dim .rule');
  const chainRect = chain ? chain.getBoundingClientRect() : null;
  const tick = document.querySelector('.tot-dim .tick');
  const tickCS = tick ? getComputedStyle(tick) : null;
  const notch = document.querySelector('.tot-dim .rd');
  const notchCS = notch ? getComputedStyle(notch) : null;
  const ext = document.querySelector('.tot-dim .ext');
  const extRect = ext ? ext.getBoundingClientRect() : null;
  const page = document.querySelector('.sec') || document.body;
  return {
    blocks,
    totalReadout: (() => { const b = document.querySelector('.tot-dim .rd b'); return b ? parseInt(b.textContent.trim(), 10) : null; })(),
    segReadout: (() => { const b = document.querySelector('.seg-dim .rd b'); return b ? parseInt(b.textContent.trim(), 10) : null; })(),
    sumOfBlocks: blocks.reduce((a, b) => a + (b.readout || 0), 0),
    tick: tickCS ? { w: chainRect ? round1(tick.getBoundingClientRect().width) : null, h: round1(tick.getBoundingClientRect().height) } : null,
    notch: notchCS ? { w: round1(notch.getBoundingClientRect().width), h: round1(notch.getBoundingClientRect().height) } : null,
    ext: extRect ? { w: round1(extRect.width), h: round1(extRect.height), left: round1(extRect.left) } : null,
    chainLeft: chainRect ? round1(chainRect.left) : null,
    firstBlockLeft: (() => { const s = document.querySelector('section.blk'); return s ? round1(s.getBoundingClientRect().left) : null; })(),
    bodyFont: getComputedStyle(document.body).fontSize,
    bodyLH: getComputedStyle(document.body).lineHeight,
    scrollH: document.documentElement.scrollHeight,
  };
})()`);

console.log('=== 页面级 ===');
console.log(`  正文 ${out.bodyFont} / 行高 ${out.bodyLH}；页面高 ${out.scrollH}px`);
console.log(`  总尺寸读数 ${out.totalReadout}；分段读数 ${out.segReadout}；六块读数之和 ${out.sumOfBlocks}`);
console.log(`  尺寸线 left=${out.chainLeft}px；首块 left=${out.firstBlockLeft}px；差 = ${out.firstBlockLeft - out.chainLeft}px（机制句要求 132px 栏宽）`);

console.log('\n=== 几何量（在浏览器里量，不在 CSS 文本里 grep） ===');
console.log(`  端点短线：${out.tick ? out.tick.w + '×' + out.tick.h + 'px' : '缺失'}  （机制句 1×9px）`);
console.log(`  断口宽：${out.notch ? out.notch.w + 'px，高 ' + out.notch.h + 'px' : '缺失'}  （机制句 12px）`);
console.log(`  延长线：${out.ext ? out.ext.w + '×' + out.ext.h + 'px' : '缺失'}  （机制句 6px 横向）`);

console.log('\n=== 每块：读数 vs 实际高度 ===');
let consistent = 0;
for (const b of out.blocks) {
  const ok = b.readout === b.linesBy24;
  if (ok) consistent++;
  console.log(`  块${b.idx} ${b.cls.replace('blk ', '').padEnd(6)} 读数=${String(b.readout).padStart(2)}  实测高=${String(b.heightPx).padStart(6)}px  高/24=${b.linesBy24}  ${ok ? '✓' : '✗'}`);
}
const uniq = new Set(out.blocks.map((b) => b.readout)).size;
console.log(`\n  读数与实测高一致：${consistent}/${out.blocks.length}`);
console.log(`  六块读数互不相同：${uniq}/${out.blocks.length}  ${uniq === out.blocks.length ? '✓' : '✗'}`);
const sumOk = out.sumOfBlocks === out.totalReadout;
console.log(`  总读数 == 六块之和：${out.sumOfBlocks} vs ${out.totalReadout}  ${sumOk ? '✓' : '✗'}`);

await browser.close();
server.close();
process.exit(0);
