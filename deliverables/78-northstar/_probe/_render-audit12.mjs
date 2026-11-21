#!/usr/bin/env node
/* 渲染层审计 · 第十二遍：给「getComputedStyle 说 opacity:0，像素却画出来了」做最小复现（2026-11-22）
 *
 * 来历：S18 的 `.job{animation:drop 40ms steps(1,end) both}` + 每项递增 delay。
 * 加载 2s 后，job3–5 的 getComputedStyle().opacity 是 "0"，但像素统计证明它们被画出来了
 * （ink% 7.6 vs 强制 op1 的 7.6 / 强制 op0 的 0.3）。
 *
 * 这一遍用三个最小 HTML 在真浏览器里定位成因，判据只有一条：
 *   「computed opacity 报 0 时，像素上是不是真的看不见」。
 * 如果两者会背离，那么**任何"读 computed opacity 判可见性"的闸门都会误报** ——
 * 这条结论直接决定我给评分器的建议该怎么写。
 *
 * 三个变体：
 *   A  steps(1,end) + fill:both   （S18 的写法）
 *   B  linear        + fill:both
 *   C  steps(1,end) + fill:none
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { inflateSync } from 'node:zlib';

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
/* 统计非白像素（背景 #ffffff） */
function inkPct(img, tol = 40) {
  let ink = 0, tot = 0;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const i = y * img.w * img.ch + x * img.ch; tot++;
    if ((255 - img.data[i]) + (255 - img.data[i + 1]) + (255 - img.data[i + 2]) > tol) ink++;
  }
  return Math.round(ink / tot * 1000) / 10;
}

const VARIANTS = {
  'A steps+fill:both': `@keyframes drop{from{opacity:0}to{opacity:1}}
.box{width:200px;height:80px;background:#1a7f3c;color:#fff;font:48px/80px sans-serif;text-align:center;
     animation:drop 40ms steps(1,end) both;animation-delay:200ms}`,
  'B linear+fill:both': `@keyframes drop{from{opacity:0}to{opacity:1}}
.box{width:200px;height:80px;background:#1a7f3c;color:#fff;font:48px/80px sans-serif;text-align:center;
     animation:drop 40ms linear both;animation-delay:200ms}`,
  'C steps+fill:none': `@keyframes drop{from{opacity:0}to{opacity:1}}
.box{width:200px;height:80px;background:#1a7f3c;color:#fff;font:48px/80px sans-serif;text-align:center;
     animation:drop 40ms steps(1,end) none;animation-delay:200ms}`,
};

const server = createServer((req, res) => {
  const k = decodeURIComponent(req.url.replace(/^\//, ''));
  const css = VARIANTS[k];
  if (!css) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
  res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#fff}${css}
  </style></head><body><div class="box">BOX</div></body></html>`);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const browser = await Browser.launch({ width: 400, height: 200 });
const pg = await browser.newPage();
await pg.setViewport({ width: 400, height: 200 });
for (const k of Object.keys(VARIANTS)) {
  await pg.goto(`http://127.0.0.1:${PORT}/${encodeURIComponent(k)}`, { settleMs: 100 });
  await new Promise((r) => setTimeout(r, 1500));
  const info = await pg.eval(`(() => {
    const e = document.querySelector('.box');
    const a = e.getAnimations()[0];
    const t = a && a.effect.getComputedTiming();
    return { op: getComputedStyle(e).opacity, playState: a && a.playState,
             progress: t && t.progress, currentTime: a && a.currentTime, endTime: t && t.endTime,
             timing: getComputedStyle(e).animationTimingFunction, fill: getComputedStyle(e).animationFillMode };
  })()`);
  const img = decodePng(Buffer.from(await pg.screenshot({ format: 'png' }), 'base64'));
  console.log(`${k.padEnd(22)} computed.opacity=${info.op}  progress=${info.progress}  playState=${info.playState}  像素墨迹=${inkPct(img)}%  → ${inkPct(img) > 2 ? '画出来了' : '看不见'}`);
}
await browser.close(); server.close();
