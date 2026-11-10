// _mkpics.mjs —— 生成 6 张**不同**的程序化 PNG 占位图（800×600），供 A 的试点复刻使用。
// 为什么不是纯色块：提示词明令「不许用 1px 图、纯色块或 CSS 画一个假图顶替」。
// 这里画的是斜条纹 + 噪点，是真位图、有真实尺寸，但不是照片——这一点会在报告里写清楚。
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'pilot-S16', 'images');
mkdirSync(OUT, { recursive: true });

const W = 800, H = 600;
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
const crc32 = (buf) => { let c = -1; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(path, paint) {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  let p = 0;
  for (let y = 0; y < H; y++) {
    raw[p++] = 0;
    for (let x = 0; x < W; x++) {
      const [r, g, b] = paint(x, y);
      raw[p++] = r; raw[p++] = g; raw[p++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const buf = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(path, buf);
}

const hash = (x, y, seed) => {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695040888963407) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const cols = [[197, 44, 15], [247, 235, 207], [26, 26, 26], [142, 42, 24], [92, 92, 85], [197, 44, 15]];
for (let i = 0; i < 6; i++) {
  const [r, g, b] = cols[i];
  const seed = i * 7919 + 13;
  const band = 18 + i * 7;
  png(join(OUT, `占位-${i + 1}.png`), (x, y) => {
    const d = ((x + y * Math.tan((12 * Math.PI) / 180)) % band + band) % band;
    const stripe = d < band / 3 ? 1 : 0;
    const n = (hash(x, y, seed) - 0.5) * 34;
    const k = stripe ? 1 : 0.78;
    return [Math.max(0, Math.min(255, r * k + n)), Math.max(0, Math.min(255, g * k + n)), Math.max(0, Math.min(255, b * k + n))];
  });
}
console.log('wrote 6 PNGs to', OUT);
