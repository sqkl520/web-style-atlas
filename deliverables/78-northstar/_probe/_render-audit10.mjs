#!/usr/bin/env node
/* 渲染层审计 · 第十遍：解开「clip 截图说看不见 / 整页截图说看得见」的矛盾（2026-11-22）
 *
 * 第九遍的结果：S18 的 5 个 job 在**整页截图**里全都被画出来了（ink% ≈ op1），
 * 但 getComputedStyle().opacity 对 job3–5 报 0，且**带 clip 的截图**也确实只有 971 字节（空白）。
 *
 * 三种信号互相打架，这条必须查到底 —— 否则我给出的"渲染验证建议"会建立在一个
 * 自己也说不准的量上。这一遍做四件事：
 *   ① 不带 clip、不滚动，直接截视口 → 这就是用户第一眼看的东西；
 *   ② 滚到 job3 进视口，再截视口（用户滚动后看到的）；
 *   ③ 同一状态下再取一次 getComputedStyle（排除"取数时动画刚好在中间"）；
 *   ④ 用 document.visibilityState / 主线程是否被节流做对照。
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
  let off = 8, w = 0, h = 0, bitDepth = 0, colorType = 0; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
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
await new Promise((r) => setTimeout(r, 2500));

console.log('① 首屏（不滚动），视口截图');
const s1 = decodePng(Buffer.from(await pg.screenshot({ format: 'png' }), 'base64'));
const boxes1 = await pg.eval(`[...document.querySelectorAll('article.job')].map(e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })`);
console.log('   opacity ' + JSON.stringify(await pg.eval(`[...document.querySelectorAll('article.job')].map(e => getComputedStyle(e).opacity)`)));
console.log('   ink%    ' + boxes1.map((b) => inkPct(s1, b)).join(', '));

console.log('\n② 滚到 job3 进视口，再截视口');
await pg.eval(`document.querySelectorAll('article.job')[2].scrollIntoView({block:'center'})`);
await new Promise((r) => setTimeout(r, 400));
const s2 = decodePng(Buffer.from(await pg.screenshot({ format: 'png' }), 'base64'));
const boxes2 = await pg.eval(`[...document.querySelectorAll('article.job')].map(e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })`);
console.log('   opacity ' + JSON.stringify(await pg.eval(`[...document.querySelectorAll('article.job')].map(e => getComputedStyle(e).opacity)`)));
console.log('   ink%    ' + boxes2.map((b) => inkPct(s2, b)).join(', '));

console.log('\n③ 同一状态下：clip 截图 vs 视口截图（都只含 job3）');
const b3 = boxes2[2];
const clipPng = await pg.screenshot({ clip: b3, format: 'png' });
const vpPng = await pg.screenshot({ format: 'png' });
console.log('   clip 字节 ' + Buffer.from(clipPng, 'base64').length + '  ink% ' + inkPct(decodePng(Buffer.from(clipPng, 'base64')), { x: 0, y: 0, w: b3.w, h: b3.h }));
console.log('   视口 字节 ' + Buffer.from(vpPng, 'base64').length + '  job3 区域 ink% ' + inkPct(decodePng(Buffer.from(vpPng, 'base64')), b3));

console.log('\n④ 用 CDP 强制把动画推到终点再截 clip');
await pg.eval(`document.querySelectorAll('article.job').forEach(e => e.getAnimations().forEach(a => { a.pause(); a.currentTime = a.effect.getComputedTiming().endTime; }))`);
await new Promise((r) => setTimeout(r, 200));
console.log('   opacity ' + JSON.stringify(await pg.eval(`[...document.querySelectorAll('article.job')].map(e => getComputedStyle(e).opacity)`)));
const clip2 = await pg.screenshot({ clip: b3, format: 'png' });
console.log('   clip 字节 ' + Buffer.from(clip2, 'base64').length + '  ink% ' + inkPct(decodePng(Buffer.from(clip2, 'base64')), { x: 0, y: 0, w: b3.w, h: b3.h }));

await browser.close(); server.close();
