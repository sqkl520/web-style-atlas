// 像素分类器：把「屏幕上真实出现的颜色」分成
//   exact    —— 与某个声明色完全一致（不透明实色）
//   aa       —— 两个声明色之间的抗锯齿过渡
//   alpha    —— 某个声明色按 alpha 叠在另一个声明色上（半透明渲染、
//               0.5px box-shadow 环、text-stroke 低不透明度边）
//   raster   —— 落在 <img>/背景图矩形里（照片，色板不负责）
//   isolated —— 以上都不是（真正可疑的「集合外色」）
//
// 两个由实验确定的关键事实（probe-blend-model.mjs 实测）：
//  F1 Chrome 的 AA / 半透明合成在 **sRGB 直线空间** 完成，不是 linear-light。
//     92285 个 AA 采样点：sRGB 平均残差 0.51/255，linear-light 平均残差 10.59/255。
//     所以判定「是不是两色混合」必须在 sRGB 里做线段距离，用 Lab 会把正确的混合判成孤色。
//  F2 rgba(193,18,31,.5) 压纸底实测 (216,124,123)，sRGB 直混预测 (216,125,123)，误差 1/255。
//
// 性能：线段距离用解析投影（不是采样），每像素 O(色对数) 次运算。
import { srgbToLab, hexToRgb, keyToHex } from './png.mjs';

export function makeClassifier(declaredHexes, opts = {}) {
  const exactTol = opts.exactTol ?? 3.0;   // 同色编码噪声（含 gamma/量化）
  // 「家族容差」：纹理叠加层（纸纹/扫描线/青色噪点，都是半透明平铺 PNG）
  // 会让一个声明色变成 ±若干色阶的一片连续值。实测（见报告）这些值离最近声明色
  // 的 RGB 欧氏距离集中在 0–12，而真正另选的颜色普遍 > 20。
  // 把这一带单独记成 near，既不冒充新色，也不被直接算成 exact。
  const nearTol = opts.nearTol ?? 15.0;
  const blendTol = opts.blendTol ?? 5.0;   // 混合线容差（sRGB 每通道量级）
  const col = declaredHexes.map((h) => ({ hex: h, rgb: hexToRgb(h) }));
  const segs = [];
  for (let i = 0; i < col.length; i++) {
    for (let j = i + 1; j < col.length; j++) {
      const a = col[i].rgb, b = col[j].rgb;
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const den = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
      if (den === 0) continue;
      let lo = 0, hi = 1;
      // 只在两色之间（不含端点，端点已由 exact 覆盖）
      segs.push({ a: col[i].hex, b: col[j].hex, a0: a, ab: ab, den: den });
    }
  }
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

  return function classify(rgb) {
    let best = null, bestD = Infinity;
    for (let i = 0; i < col.length; i++) {
      const d = dist(rgb, col[i].rgb);
      if (d < bestD) { bestD = d; best = col[i]; }
    }
    if (bestD <= exactTol) return { kind: 'exact', hex: best.hex, d: bestD };

    let bs = null, bsD = Infinity, bsT = 0;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const ap = [rgb[0] - s.a0[0], rgb[1] - s.a0[1], rgb[2] - s.a0[2]];
      let t = (ap[0] * s.ab[0] + ap[1] * s.ab[1] + ap[2] * s.ab[2]) / s.den;
      if (t < 0.02 || t > 0.98) continue;         // 端点附近归 exact
      const q0 = s.a0[0] + s.ab[0] * t, q1 = s.a0[1] + s.ab[1] * t, q2 = s.a0[2] + s.ab[2] * t;
      const d = Math.hypot(rgb[0] - q0, rgb[1] - q1, rgb[2] - q2);
      if (d < bsD) { bsD = d; bs = s; bsT = t; }
    }
    if (bsD <= blendTol) {
      // t≈0.5 且两色亮度差大 → 半透明叠加；极端 t → 抗锯齿
      return { kind: bsD < 2.5 ? 'aa' : 'alpha', hex: bs.a, hex2: bs.b, d: bsD, t: bsT };
    }
    if (bestD <= nearTol) return { kind: 'near', hex: best.hex, d: bestD };
    return { kind: 'isolated', d: bestD, nearest: best.hex };
  };
}

// 逐像素分类。photoMask[i]=1 → 照片区域，跳过（照片色不由色板决定）。
// inkMask[i]=1 → 文字墨迹矩形内（含 ±3px 膨胀）。
//
// 为什么要单独分出 textedge（这是本任务最大的一个误报坑）：
//   文字抗锯齿的混合**不在 sRGB 直线上** —— Chrome 对文字走 gamma 校正混合，
//   glyph 边缘会出现「偏离任何两色连线」的像素。实测（probe-diag-iso-text.mjs）：
//     S21 孤立像素 178358 个，其中 174889 (98.1%) 落在文字墨迹矩形 ±3px 内；
//     S19 孤立 363634 个，357128 (98.2%) 是文字边缘，真正远离文字的 0 个；
//     S20 孤立 1530025 个，352563 (23%) 文字边缘，其余全在照片矩形内，远离文字 0 个。
//   也就是说：不区分 textedge 的话，「孤立色」这个指标主要在测量字体渲染器，
//   而不是测量设计用的颜色。这是必须写进报告的结论。
export function analyzePixels(img, declaredHexes, photoMask, inkMask) {
  const cls = makeClassifier(declaredHexes);
  const { width, data } = img;
  const n = width * img.height;
  const perHex = new Map();
  const kinds = { exact: 0, near: 0, aa: 0, alpha: 0, textedge: 0, isolated: 0, raster: 0 };
  const isolated = new Map();
  const nearMap = new Map();
  const blendPairs = new Map();
  const cache = new Map();
  let counted = 0;
  for (let i = 0; i < n; i++) {
    if (photoMask && photoMask[i]) { kinds.raster++; continue; }
    const d = i * 4;
    if (data[d + 3] < 8) continue;
    const k = (data[d] << 16) | (data[d + 1] << 8) | data[d + 2];
    let c = cache.get(k);
    if (!c) { c = cls([(k >> 16) & 255, (k >> 8) & 255, k & 255]); cache.set(k, c); }
    counted++;
    // 文字墨迹区内的非实色像素：一律归 textedge，不算集合外色
    if (inkMask && inkMask[i] && (c.kind === 'isolated' || c.kind === 'near' || c.kind === 'aa' || c.kind === 'alpha')) {
      kinds.textedge++;
      continue;
    }
    kinds[c.kind]++;
    if (c.kind === 'exact') perHex.set(c.hex, (perHex.get(c.hex) || 0) + 1);
    else if (c.kind === 'near') {
      perHex.set(c.hex, (perHex.get(c.hex) || 0) + 1);
      nearMap.set(c.hex, (nearMap.get(c.hex) || 0) + 1);
    } else if (c.kind === 'aa' || c.kind === 'alpha') {
      const key = c.hex < c.hex2 ? c.hex + '~' + c.hex2 : c.hex2 + '~' + c.hex;
      blendPairs.set(key, (blendPairs.get(key) || 0) + 1);
      if (c.kind === 'alpha') perHex.set(c.hex, (perHex.get(c.hex) || 0) + 1);
    } else {
      const hx = keyToHex(k);
      isolated.set(hx, (isolated.get(hx) || 0) + 1);
    }
  }
  return {
    counted, kinds, perHex, uniqueColors: cache.size,
    near: [...nearMap.entries()].sort((a, b) => b[1] - a[1]),
    isolated: [...isolated.entries()].sort((a, b) => b[1] - a[1]),
    blendPairs: [...blendPairs.entries()].sort((a, b) => b[1] - a[1]),
  };
}

export function rasterMask(img, rects, dpr = 1) {
  const { width, height } = img;
  const mask = new Uint8Array(width * height);
  for (const r of rects) {
    const x0 = Math.max(0, Math.floor(r.x * dpr)), x1 = Math.min(width, Math.ceil((r.x + r.w) * dpr));
    const y0 = Math.max(0, Math.floor(r.y * dpr)), y1 = Math.min(height, Math.ceil((r.y + r.h) * dpr));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) mask[y * width + x] = 1;
  }
  return mask;
}
