/* 把 S99 那套「机制值是否自洽」的判据，原样套到 S31 的产物上。
 *
 * 为什么必须做：负对照的结论是 A 还是 B，取决于「S99 的命中质量」与「S31 的命中质量」
 * 差多少。如果只对 S99 查语义自洽、对 S31 只数那 6 个数，就是双重标准 ——
 * 本仓库记录在案的老病（闸门只在自己方便的地方严）。
 *
 * S31 的机制句有三个可测值 + 一个语义要求：
 *   主刻度 每 60px、长 34px、3px 宽；次刻度 每 12px、长 12px、2px 宽；
 *   上下各一排共用两条贯穿基线 —— 刻度既做读数骨架也顶掉图片的位置。
 * 语义要求：刻度带必须贯穿版面宽度、必须真的在上下两处出现。
 *
 * 用法：node deliverables/78-northstar/_probe/_s31-mechanism.mjs
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png' };
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
await pg.goto(`http://127.0.0.1:${port}/deliverables/78-northstar/_probe/_sandbox-S31-out.html`, { settleMs: 1200 });

const out = await pg.eval(`(() => {
  const r1 = (n) => Math.round(n * 10) / 10;
  const ticks = [...document.querySelectorAll('.ticks')];
  const rows = ticks.map((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      cls: el.className,
      w: r1(r.width), h: r1(r.height),
      bgSize: cs.backgroundSize,
      bgPos: cs.backgroundPosition,
      bgImage: cs.backgroundImage.slice(0, 140),
    };
  });
  /* 从 SVG 纹理的声明里取出两档刻度的几何：width/height 与 rect 的 width */
  const declared = ticks.map((el) => {
    const bi = getComputedStyle(el).backgroundImage;
    const w = [...bi.matchAll(/width='?(\\d+)'?/g)].map((m) => +m[1]);
    const h = [...bi.matchAll(/height='?(\\d+)'?/g)].map((m) => +m[1]);
    return { w, h };
  });
  const rulers = [...document.querySelectorAll('.ruler')].map((el) => {
    const r = el.getBoundingClientRect();
    return { x: r1(r.left), w: r1(r.width), y: r1(r.top) };
  });
  return { rows, declared, rulers, pageW: document.documentElement.clientWidth };
})()`);

console.log('=== S31 产物的刻度带 ===');
console.log(`  视口宽 ${out.pageW}px；刻度带 ${out.rows.length} 条`);
for (const r of out.rows) {
  console.log(`  ${r.cls.padEnd(22)} ${r.w}×${r.h}px  bg-size=${r.bgSize}  bg-pos=${r.bgPos}`);
}
console.log('\n  纹理里声明的几何（width/height 依次出现）:');
for (const d of out.declared) console.log(`    w=${JSON.stringify(d.w)} h=${JSON.stringify(d.h)}`);
console.log('\n  尺规容器：');
for (const r of out.rulers) console.log(`    x=${r.x} w=${r.w} y=${r.y}`);
console.log('\n  （机制句：主刻度 60/34/3，次刻度 12/12/2；上下各一排、贯穿两条基线）');
await browser.close();
server.close();
process.exit(0);
