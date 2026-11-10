// 极简 PNG 解码（仅 8-bit、非隔行、RGB/RGBA/Gray）—— 只为逐像素对比截图。
// 为什么不用 canvas 回灌：实测两张整页图 base64 合计 ~5MB，塞进 Runtime.evaluate
// 的表达式超过 CDP 能接受的长度，参数被截断成 undefined（TypeError: reading 'u1'）。
import { inflateSync } from 'node:zlib';

export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not png');
  let off = 8, W = 0, H = 0, depth = 0, ctype = 0, interlace = 0;
  const idat = [];
  let plte = null, trns = null;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      W = data.readUInt32BE(0); H = data.readUInt32BE(4);
      depth = data[8]; ctype = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'PLTE') plte = Buffer.from(data);
    else if (type === 'tRNS') trns = Buffer.from(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (depth !== 8) throw new Error('only 8-bit png, got ' + depth);
  if (interlace) throw new Error('interlaced png unsupported');
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  if (!channels) throw new Error('colour type ' + ctype);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = W * channels;
  const out = Buffer.alloc(W * H * 4);
  let prev = Buffer.alloc(stride);
  let p = 0;
  for (let y = 0; y < H; y++) {
    const f = raw[p++];
    const line = Buffer.from(raw.subarray(p, p + stride)); p += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = line[i];
      if (f === 1) v = (v + a) & 255;
      else if (f === 2) v = (v + b) & 255;
      else if (f === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (f === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      } else if (f !== 0) throw new Error('filter ' + f);
      line[i] = v;
    }
    prev = line;
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      if (ctype === 6) { out[o] = line[x * 4]; out[o + 1] = line[x * 4 + 1]; out[o + 2] = line[x * 4 + 2]; out[o + 3] = line[x * 4 + 3]; }
      else if (ctype === 2) { out[o] = line[x * 3]; out[o + 1] = line[x * 3 + 1]; out[o + 2] = line[x * 3 + 2]; out[o + 3] = 255; }
      else if (ctype === 0) { out[o] = out[o + 1] = out[o + 2] = line[x]; out[o + 3] = 255; }
      else if (ctype === 4) { out[o] = out[o + 1] = out[o + 2] = line[x * 2]; out[o + 3] = line[x * 2 + 1]; }
      else if (ctype === 3) { const k = line[x] * 3; out[o] = plte[k]; out[o + 1] = plte[k + 1]; out[o + 2] = plte[k + 2]; out[o + 3] = 255; }
    }
  }
  return { W, H, px: out };
}

export function diffPngs(a, b) {
  const A = decodePng(a), B = decodePng(b);
  if (A.W !== B.W || A.H !== B.H) return { sizeMismatch: true, a: [A.W, A.H], b: [B.W, B.H] };
  const { W, H, px: pa } = A; const { px: pb } = B;
  let n = 0, minX = 1e9, minY = 1e9, maxX = -1, maxY = -1, maxDelta = 0;
  const samples = [];
  const rows = new Map();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      if (pa[o] !== pb[o] || pa[o + 1] !== pb[o + 1] || pa[o + 2] !== pb[o + 2] || pa[o + 3] !== pb[o + 3]) {
        n++;
        const d = Math.max(Math.abs(pa[o] - pb[o]), Math.abs(pa[o + 1] - pb[o + 1]), Math.abs(pa[o + 2] - pb[o + 2]), Math.abs(pa[o + 3] - pb[o + 3]));
        if (d > maxDelta) maxDelta = d;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        rows.set(y, (rows.get(y) || 0) + 1);
        if (samples.length < 10) samples.push({ x, y, a: [...pa.subarray(o, o + 4)], b: [...pb.subarray(o, o + 4)], d });
      }
    }
  }
  const topRows = [...rows.entries()].sort((p, q) => q[1] - p[1]).slice(0, 12);
  return { W, H, n, minX, minY, maxX, maxY, maxDelta, samples, topRows, totalPx: W * H };
}
