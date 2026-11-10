// 生成 S31 的唯一一张图：尺规纹理（不是照片）。
// 为什么用 Node 手写而不是 make-textures.py：本机 Python 只有 Windows Store 的转发壳，
// 实际不可用（which python → WindowsApps 的 stub，运行无输出）。
// 这段是确定性的：固定参数、无随机、无时间戳，重跑得到同一份字节。
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 1280, H = 720;
const BG = [0x6E, 0x6A, 0x63];       // --paper-deep
const INK = [0x1C, 0x1B, 0x19];
const RULE = [0x3D, 0x3A, 0x35];   // 原来用 #5B5750，与底色 #6E6A63 只差 1.34:1，几乎看不见

// RGBA 像素缓冲
const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) { px[i*3] = BG[0]; px[i*3+1] = BG[1]; px[i*3+2] = BG[2]; }
const set = (x, y, c, a = 1) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i]   = Math.round(px[i]   * (1 - a) + c[0] * a);
  px[i+1] = Math.round(px[i+1] * (1 - a) + c[1] * a);
  px[i+2] = Math.round(px[i+2] * (1 - a) + c[2] * a);
};

// 纸纤维：确定性噪声（线性同余，固定种子）
let seed = 20261110;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
for (let i = 0; i < W * H / 9; i++) {
  const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H);
  set(x, y, rnd() > 0.5 ? INK : [0x8A, 0x86, 0x7C], 0.035);
}

// 尺规：横向主刻度每 60px（长 34px），次刻度每 12px（长 12px），全幅纵向居中带
const bandTop = Math.floor(H / 2) - 60, bandBot = Math.floor(H / 2) + 60;
for (let x = 0; x < W; x += 12) {
  const isMajor = (x % 60 === 0);
  const len = isMajor ? 34 : 12;
  for (let k = 0; k < len; k++) { for (let w = 0; w < (isMajor ? 3 : 2); w++) set(x + w, bandTop + k, isMajor ? INK : RULE, isMajor ? 1 : 0.85); }
  for (let k = 0; k < len; k++) { for (let w = 0; w < (isMajor ? 3 : 2); w++) set(x + w, bandBot - k, isMajor ? INK : RULE, isMajor ? 1 : 0.85); }
}
// 基线：两条贯穿横线
for (let x = 0; x < W; x++) { set(x, bandTop, INK, 0.9); set(x, bandBot, INK, 0.9); }

// 编码 PNG（RGB，无滤波）
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0;
  Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
}
const crcTable = (() => { const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (buf) => { let c = -1; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
mkdirSync('prototypes/S31-quiet-mid-grey-rulesheet/assets', { recursive: true });
writeFileSync('prototypes/S31-quiet-mid-grey-rulesheet/assets/ruler-field.png', png);
console.log('已写 assets/ruler-field.png', png.length, '字节', W + 'x' + H);
