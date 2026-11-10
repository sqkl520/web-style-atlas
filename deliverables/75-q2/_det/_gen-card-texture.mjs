// S32 的索引卡纹理（不是照片）。确定性：固定种子、无时间戳。
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 1200, H = 800;
const CARD = [0xB8, 0x9A, 0xD0];      // 卡片纸（比底色浅一档）
const CARD2 = [0xA8, 0x88, 0xC2];
const INK = [0x24, 0x1A, 0x2E];
const RULE = [0x6B, 0x4E, 0x84];

const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) { px[i*3]=CARD[0]; px[i*3+1]=CARD[1]; px[i*3+2]=CARD[2]; }
const set = (x, y, c, a = 1) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i]   = Math.round(px[i]   * (1-a) + c[0] * a);
  px[i+1] = Math.round(px[i+1] * (1-a) + c[1] * a);
  px[i+2] = Math.round(px[i+2] * (1-a) + c[2] * a);
};
let seed = 20261110;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

// 卡纸纤维
for (let i = 0; i < W * H / 8; i++) {
  const x = Math.floor(rnd()*W), y = Math.floor(rnd()*H);
  set(x, y, rnd() > 0.5 ? INK : CARD2, 0.04);
}

// 一叠卡片的错位轮廓：三层，每层偏移 8px，模拟卡片堆叠
for (let d = 3; d >= 1; d--) {
  const ox = d * 9, oy = d * 9;
  for (let x = 40 + ox; x < W - 40 + ox; x++) { set(x, 40 + oy, RULE, 0.5); set(x, H - 40 + oy, RULE, 0.5); }
  for (let y = 40 + oy; y < H - 40 + oy; y++) { set(40 + ox, y, RULE, 0.5); set(W - 40 + ox, y, RULE, 0.5); }
}

// 卡片上的横格线（索引卡的书写线）
for (let y = 170; y < H - 90; y += 46) {
  for (let x = 90; x < W - 90; x++) set(x, y, RULE, 0.42);
}

// 左上角编号框
for (let x = 90; x < 250; x++) { set(x, 92, INK, 0.7); set(x, 150, INK, 0.7); }
for (let y = 92; y < 150; y++) { set(90, y, INK, 0.7); set(249, y, INK, 0.7); }
// 编号框内的两条短横（示意字迹，不画具体字符）
for (let x = 106; x < 200; x++) { set(x, 116, INK, 0.55); }
for (let x = 106; x < 172; x++) { set(x, 132, INK, 0.4); }

// 右下角磨损：一块色差
for (let i = 0; i < 9000; i++) {
  const x = W - 260 + Math.floor(rnd()*220), y = H - 220 + Math.floor(rnd()*180);
  set(x, y, INK, 0.05);
}

// PNG 编码
const raw = Buffer.alloc((W*3+1)*H);
for (let y = 0; y < H; y++) { raw[y*(W*3+1)] = 0; Buffer.from(px.buffer, y*W*3, W*3).copy(raw, y*(W*3+1)+1); }
const crcTable = (() => { const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (b) => { let c = -1; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2;
const png = Buffer.concat([
  Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
]);
mkdirSync('prototypes/S32-violet-card-cabinet/assets', { recursive: true });
writeFileSync('prototypes/S32-violet-card-cabinet/assets/card-index.png', png);
console.log('已写 card-index.png', png.length, '字节', W+'x'+H);
