#!/usr/bin/env node
/* 渲染层审计 · 第九遍：S18 的「计算样式说看不见 / 截图看起来看得见」到底哪个对（2026-11-22）
 *
 * 这一遍在 Node 侧自己解 PNG（zlib + 反滤波），在像素层面判定，
 * 不依赖页面里的 canvas，也不依赖 eval 传大字符串（那条路会撑爆 websocket）。
 *
 * 判定方法：
 *   ① 同一会话里截「整页」和「单个 job 的 clip」，分别数非纸色像素；
 *   ② 再强制 opacity:1 / opacity:0 各截一张 clip，作为上下界；
 *   ③ 整页图里每个 job 区域的 ink% 落在 [op0, op1] 的哪一端。
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';

const ROOT = resolve('D:/Web/style');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };
const server = createServer(async (req, res) => {
  try {
    const buf = await readFile(join(ROOT, decodeURIComponent(req.url.split('?')[0])));
    res.writeHead(200, { 'Content-Type': MIME[extname(req.url)] || 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

/* ── 最小 PNG 解码器：只支持 8-bit RGB/RGBA、非隔行（Chrome 截图就是这种） ── */
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not png');
  let off = 8, w = 0, h = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8) throw new Error('bitDepth ' + bitDepth);
  const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 0;
  if (!ch) throw new Error('colorType ' + colorType);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++];
    const line = raw.subarray(p, p + stride); p += stride;
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[x] = v & 255;
    }
  }
  return { w, h, ch, data: out };
}
/* 数区域里"偏离纸色 #C8C4AE(200,196,174)"的像素占比 */
function inkPct(img, box, ref = [200, 196, 174], tol = 60) {
  let ink = 0, tot = 0;
  const x0 = Math.max(0, box.x), y0 = Math.max(0, box.y);
  const x1 = Math.min(img.w, box.x + box.w), y1 = Math.min(img.h, box.y + box.h);
  for (let y = y0; y < y1; y++) {
    const row = y * img.w * img.ch;
    for (let x = x0; x < x1; x++) {
      const i = row + x * img.ch;
      tot++;
      if (Math.abs(img.data[i] - ref[0]) + Math.abs(img.data[i + 1] - ref[1]) + Math.abs(img.data[i + 2] - ref[2]) > tol) ink++;
    }
  }
  return tot ? Math.round(ink / tot * 1000) / 10 : 0;
}

const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();
await pg.setViewport({ width: 1440, height: 900 });
const U = `http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/S18/index.html`;

await pg.goto(U, { settleMs: 100 });
await new Promise((r) => setTimeout(r, 2000));
const boxes = await pg.eval(`[...document.querySelectorAll('article.job')].map(e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })`);
const ops = await pg.eval(`[...document.querySelectorAll('article.job')].map(e => getComputedStyle(e).opacity)`);

const fullPng = Buffer.from(await pg.screenshot({ format: 'png' }), 'base64');
const full = decodePng(fullPng);
console.log(`整页截图 ${full.w}x${full.h}`);
console.log('computed opacity: ' + JSON.stringify(ops));
console.log('整页图里各 job 区域 ink%: ' + boxes.map((b) => inkPct(full, b)).join(', '));

/* 上下界：逐个 job 强制 opacity 0/1，各截一张整页 */
const inkAt = {};
for (const [label, css] of [['op1', 'opacity:1!important;animation:none!important'], ['op0', 'opacity:0!important;animation:none!important']]) {
  await pg.eval(`document.querySelectorAll('article.job').forEach(e => { e.style.cssText = ${JSON.stringify(css)}; })`);
  await new Promise((r) => setTimeout(r, 100));
  const img = decodePng(Buffer.from(await pg.screenshot({ format: 'png' }), 'base64'));
  inkAt[label] = boxes.map((b) => inkPct(img, b));
}
console.log('强制 opacity:1 → ink%: ' + inkAt.op1.join(', '));
console.log('强制 opacity:0 → ink%: ' + inkAt.op0.join(', '));

const actual = boxes.map((b) => inkPct(full, b));
console.log('\n判定（实际更接近哪一端）：');
actual.forEach((v, i) => {
  const d0 = Math.abs(v - inkAt.op0[i]), d1 = Math.abs(v - inkAt.op1[i]);
  console.log(`  job${i + 1}  实际 ${v}%   op0 ${inkAt.op0[i]}%  op1 ${inkAt.op1[i]}%  → ${d0 <= d1 ? '看不见（≈op0）' : '看得见（≈op1）'}`);
});
await browser.close(); server.close();
