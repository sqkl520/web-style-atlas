// 生成两张预烘焙位图：四角减光遮罩（cos⁴ 透镜法则）与银盐颗粒瓦片。
// 规格字段 6 要求"减光曲线必须用预生成的遮罩位图而非 CSS 蒙版"，
// 字段 11 要求"颗粒在构建期烧进位图"。两者都在这里离线算出。
// 纯 Node（node:zlib），无第三方依赖。
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'assets');
mkdirSync(OUT, { recursive: true });

/* ── 最小 PNG 编码器（8 位 RGBA，无隔行） ── */
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return (buf) => { let c = -1; for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
})();

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(body));
  return Buffer.concat([len, body, crc]);
}

function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ── 1. 四角减光遮罩：cos⁴ 法则，中心 0、四角 32%，带有序抖动防色带 ── */
const BAYER = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];

function vignette(size = 256, corner = 0.32) {
  const buf = Buffer.alloc(size * size * 4);
  const thetaMax = 0.7;
  const cos4 = (t) => Math.pow(Math.cos(t), 4);
  const denom = 1 - cos4(thetaMax);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = ((x + 0.5) / size) * 2 - 1;
      const ny = ((y + 0.5) / size) * 2 - 1;
      const r = Math.min(1, Math.hypot(nx, ny) / Math.SQRT2);
      const a = corner * (1 - cos4(r * thetaMax)) / denom;
      const dither = (BAYER[(y % 8) * 8 + (x % 8)] / 64 - 0.5) * (2 / 255);
      const i = (y * size + x) * 4;
      buf[i] = 16; buf[i + 1] = 26; buf[i + 2] = 28;            // 与 --void 同色，只压亮度不引入新色
      buf[i + 3] = Math.max(0, Math.min(255, Math.round((a + dither) * 255)));
    }
  }
  return png(size, size, buf);
}

/* ── 2. 银盐颗粒瓦片：确定性伪随机，暗部可见、亮部干净 ── */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function grain(size = 128, seed = 19570323) {
  const rnd = mulberry32(seed);
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = rnd();
    // 颗粒是密度起伏：一半偏亮、一半偏暗，透明度都很低
    const level = v < 0.5 ? 92 + Math.round(v * 60) : 170 + Math.round((v - 0.5) * 90);
    const alpha = Math.round(rnd() * 46);
    buf[i * 4] = level; buf[i * 4 + 1] = level; buf[i * 4 + 2] = Math.round(level * 0.97);
    buf[i * 4 + 3] = alpha;
  }
  return png(size, size, buf);
}

writeFileSync(join(OUT, 'vignette.png'), vignette());
writeFileSync(join(OUT, 'grain.png'), grain());
console.log('wrote assets/vignette.png and assets/grain.png');
