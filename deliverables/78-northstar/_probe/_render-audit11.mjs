#!/usr/bin/env node
/* 渲染层审计 · 第十一遍：修正第十遍的测量污染，给出 S18 的最终判定（2026-11-22）
 *
 * 第十遍的 ink% 测量有一个错误：job3 的盒子 x=906..1220，而 .paper 只到 x≈1123，
 * 盒子右侧 ~97px 落在暗色 bay(#0A0D0A) 上。把这段算进"墨迹"后，
 * 即使 job3 完全透明，ink% 也有 31% —— 于是"op0 基线"根本不是 0，
 * 判定自然全错。这正是本仓库反复出现的「量错了对象」。
 *
 * 这一遍把测量窗口裁到纸面以内，并用「同一布局下的三种状态」对照：
 *   实际 / 强制 opacity:1 / 强制 opacity:0（三种都不动 animation，避免重排）。
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';

const ROOT = resolve('D:/Web/style');
const server = createServer(async (req, res) => {
  try {
    const buf = await readFile(join(ROOT, decodeURIComponent(req.url.split('?')[0])));
    res.writeHead(200, { 'Content-Type': extname(req.url) === '.html' ? 'text/html;charset=utf-8' : 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

function decodePng(buf) {
  let off = 8, w = 0, h = 0, colorType = 0; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch, out = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++], line = raw.subarray(p, p + stride); p += stride;
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0, b = prev ? prev[x] : 0, c = prev && x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[x] = v & 255;
    }
  }
  return { w, h, ch, data: out };
}
/* 与纸色 #C8C4AE 比；tol 60 */
function inkPct(img, box, ref = [200, 196, 174], tol = 60) {
  let ink = 0, tot = 0;
  const x0 = Math.max(0, box.x), y0 = Math.max(0, box.y);
  const x1 = Math.min(img.w, box.x + box.w), y1 = Math.min(img.h, box.y + box.h);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = y * img.w * img.ch + x * img.ch; tot++;
    if (Math.abs(img.data[i] - ref[0]) + Math.abs(img.data[i + 1] - ref[1]) + Math.abs(img.data[i + 2] - ref[2]) > tol) ink++;
  }
  return tot ? Math.round(ink / tot * 1000) / 10 : 0;
}

const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();
await pg.setViewport({ width: 1440, height: 900 });
const U = `http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/S18/index.html`;
await pg.goto(U, { settleMs: 100 });
await new Promise((r) => setTimeout(r, 2200));

/* 纸面右边界：取 .paper 的盒子，测量窗口裁到它里面 */
const paper = await pg.eval(`(() => { const r = document.querySelector('.paper').getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width) }; })()`);
const paperRight = paper.x + paper.w;
const boxes = await pg.eval(`[...document.querySelectorAll('article.job')].map(e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })`);
const clipBoxes = boxes.map((b) => ({ x: b.x, y: b.y, w: Math.min(b.w, paperRight - b.x), h: b.h }));
console.log(`纸面 x=${paper.x}..${paperRight}；测量窗口已裁到纸内`);
console.log('盒子 ' + JSON.stringify(clipBoxes));

async function shot() { return decodePng(Buffer.from(await pg.screenshot({ format: 'png' }), 'base64')); }
const ops = await pg.eval(`[...document.querySelectorAll('article.job')].map(e => getComputedStyle(e).opacity)`);
const imgActual = await shot();
const actual = clipBoxes.map((b) => inkPct(imgActual, b));

/* 三种状态对照：只改 opacity，不动 animation（避免重排/重算布局） */
const states = {};
for (const [label, val] of [['op1', '1'], ['op0', '0']]) {
  await pg.eval(`document.querySelectorAll('article.job').forEach(e => { e.style.setProperty('opacity', ${JSON.stringify(val)}, 'important'); })`);
  await new Promise((r) => setTimeout(r, 150));
  const img = await shot();
  states[label] = clipBoxes.map((b) => inkPct(img, b));
}
console.log('\ncomputed opacity: ' + JSON.stringify(ops));
console.log('实际        ink%: ' + actual.join(', '));
console.log('强制 op=1   ink%: ' + states.op1.join(', '));
console.log('强制 op=0   ink%: ' + states.op0.join(', '));
console.log('\n判定（与哪一端更近）：');
actual.forEach((v, i) => {
  const d0 = Math.abs(v - states.op0[i]), d1 = Math.abs(v - states.op1[i]);
  console.log(`  job${i + 1}  实际 ${v}%  op0 ${states.op0[i]}%  op1 ${states.op1[i]}%  → ${d0 < d1 ? '看不见' : d1 < d0 ? '看得见' : '两可'}`);
});

await browser.close(); server.close();
