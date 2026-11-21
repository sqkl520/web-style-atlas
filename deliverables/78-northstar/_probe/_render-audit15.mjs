#!/usr/bin/env node
/* 渲染层审计 · 第十五遍：给 S18 的「到底看不看得见」一个不可辩驳的答案（2026-11-22）
 *
 * 前面的证据互相矛盾，必须收敛，否则建议不可信：
 *   · getComputedStyle 说 job3–5 的 opacity = "0"
 *   · 整页截图按盒子区域统计：ink% 与"强制 opacity:1"几乎相同（≈8%）
 *   · 但一张 y=335、h=291 的 clip 截图只有 971 字节（≈空白）
 *
 * 这一遍不用 clip（它在 captureBeyondViewport=false 下行为可疑），
 * 改成：把整页 PNG 在 **Node 侧**按盒子坐标裁剪，落盘成独立 PNG 文件供人眼复核。
 * 同时打印裁剪区的像素直方图 —— 空白区域和文字区域的分布完全不同。
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { inflateSync, deflateSync } from 'node:zlib';

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
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return (b) => { let c = -1; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }; })();
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(img, box) {
  const w = box.w, h = box.h;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  let p = 0;
  for (let y = 0; y < h; y++) {
    raw[p++] = 0;
    for (let x = 0; x < w; x++) {
      const i = (y + box.y) * img.w * img.ch + (x + box.x) * img.ch;
      raw[p++] = img.data[i]; raw[p++] = img.data[i + 1]; raw[p++] = img.data[i + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function hist(img, box) {
  const m = new Map();
  for (let y = box.y; y < box.y + box.h; y++) for (let x = box.x; x < box.x + box.w; x++) {
    const i = y * img.w * img.ch + x * img.ch;
    const k = `${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([k, n]) => `${k}×${n}`);
}

const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();
await pg.setViewport({ width: 1440, height: 900 });
await pg.goto(`http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/S18/index.html`, { settleMs: 100 });
await new Promise((r) => setTimeout(r, 2200));
const img = decodePng(Buffer.from(await pg.screenshot({ format: 'png' }), 'base64'));
const boxes = await pg.eval(`[...document.querySelectorAll('article.job')].map(e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })`);
const ops = await pg.eval(`[...document.querySelectorAll('article.job')].map(e => getComputedStyle(e).opacity)`);
console.log('computed opacity: ' + JSON.stringify(ops));

const paperRight = 1123;
for (let i = 0; i < boxes.length; i++) {
  const b = boxes[i];
  const box = { x: b.x, y: b.y, w: Math.min(b.w, paperRight - b.x), h: b.h };
  const png = encodePng(img, box);
  const out = join(ROOT, 'deliverables/78-northstar/_probe', `_crop-job${i + 1}.png`);
  await writeFile(out, png);
  console.log(`job${i + 1}  ${JSON.stringify(box)}  png ${png.length}B  主色 ${hist(img, box).join('  ')}`);
}
await browser.close(); server.close();
