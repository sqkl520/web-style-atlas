/**
 * 04 · 对被丢色的面积做**归因**：它是真的独立色，还是保留色的近邻/纹理噪声？
 *
 * 为什么必须做这一步：03 量出「S06 被丢色占 62%」，若直接写进报告，结论会是
 * 「data.js 丢掉了页面上一大半的颜色」——但 S06 被丢的三个色是
 * #E6D8BC / #E0D0B0 / #E4D5B8，与它的纸色极其接近，肉眼几乎不可分。
 * 它们的大面积几乎肯定来自**纹理/渐变/抗锯齿**，不是「第三、第四种色」。
 *
 * 判据（三条，全部要过才算"独立的色"）：
 *   G1 与最近的保留色 ΔE76 ≥ 10（肉眼可辨；<10 视为同一色族）
 *   G2 在自己的声明上带**角色名**（:root 变量名 / 注释），不是纯数值
 *   G3 面积不是集中在渐变的连续区域 —— 用"色块连通性"太难，改用更稳的代理：
 *      该色在**样式面**里被 var() 引用的次数 ≥1，或它在 CSS 里以独立声明出现
 *      （纯抗锯齿产物不会有自己的 :root 声明）
 *
 * 运行：node deliverables/71-plan/facts/04-dropped-attribution.mjs
 */
import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import {
  IDS, PROTO, DIR_OF, loadData, loadPrompts, readRoot, hexOf,
  paletteOfData, paletteOfPrompts, writeJson, mdTable,
} from './lib.mjs';
import { decodePng } from './png.mjs';

/* ── Lab / ΔE（与 03 同一实现，纯函数） ─────────────────────────── */
const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function rgb2lab([r, g, b]) {
  const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const R = f(r), G = f(g), B = f(b);
  let X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  let Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
  let Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
  X /= 0.95047; Y /= 1; Z /= 1.08883;
  const t = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  const fx = t(X), fy = t(Y), fz = t(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const dE = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
const deltaE = (h1, h2) => +dE(rgb2lab(hex2rgb(h1)), rgb2lab(hex2rgb(h2))).toFixed(2);

const D = Object.fromEntries(loadData().rows.map((r) => [r.id, r]));
const P = Object.fromEntries(loadPrompts().doc.schemes.map((r) => [r.id, r]));
const pixels = JSON.parse(readFileSync(join(import.meta.dirname, '03-pixels.json'), 'utf8'));
const pxById = Object.fromEntries(pixels.rows.filter((r) => !r.error).map((r) => [r.id, r]));

const rows = [];
for (const id of IDS) {
  const l1 = paletteOfData(D[id].palette);
  const l3 = paletteOfPrompts(P[id].dna.palette);
  const dropped = l3.filter((h) => !l1.includes(h));
  const root = readRoot(id);
  // :root 里每个 hex 的变量名与注释（"角色名"证据）
  const roles = {};
  for (const d of root.declarations) {
    const h = hexOf(d.value);
    if (h) (roles[h] = roles[h] || []).push({ name: d.name, note: d.note, line: d.line });
  }
  const px = pxById[id];

  const detail = dropped.map((h) => {
    const nearKept = l1.map((k) => ({ k, dE: deltaE(h, k) })).sort((a, b) => a.dE - b.dE)[0];
    const role = roles[h] || [];
    return {
      hex: h,
      areaPct: px ? (px.pct[h] || 0) : null,
      nearestKept: nearKept.k,
      nearestKeptDE: nearKept.dE,
      hasRole: role.length > 0,
      roleNames: role.map((r) => r.name + (r.note ? ' /*' + r.note + '*/' : '')),
      /* G1 独立色族 / G2 有角色名 / G3 有自己的声明 */
      distinct: nearKept.dE >= 10,
      declared: role.length > 0,
      independent: nearKept.dE >= 10 && role.length > 0,
    };
  });

  rows.push({
    id, L1: l1, L3: l3, dropped,
    detail,
    /* 三个量：全部被丢色的面积 / 其中"独立色"部分的面积 / "近邻噪声"部分 */
    droppedAreaAll: +detail.reduce((a, d) => a + (d.areaPct || 0), 0).toFixed(3),
    droppedAreaIndependent: +detail.filter((d) => d.independent).reduce((a, d) => a + (d.areaPct || 0), 0).toFixed(3),
    droppedAreaNearDup: +detail.filter((d) => !d.distinct).reduce((a, d) => a + (d.areaPct || 0), 0).toFixed(3),
    nIndependent: detail.filter((d) => d.independent).length,
    nNearDup: detail.filter((d) => !d.distinct).length,
  });
}

const sum = {
  totalDropped: rows.reduce((a, r) => a + r.dropped.length, 0),
  nNearDup: rows.reduce((a, r) => a + r.nNearDup, 0),
  nDistinct: rows.reduce((a, r) => a + (r.dropped.length - r.nNearDup), 0),
  nIndependent: rows.reduce((a, r) => a + r.nIndependent, 0),
  /* 关键结论量：把近邻噪声剔掉之后，还剩多少面积是"data.js 真的没画出来"的 */
  meanDroppedAll: +(rows.reduce((a, r) => a + r.droppedAreaAll, 0) / rows.length).toFixed(2),
  meanDroppedIndependent: +(rows.reduce((a, r) => a + r.droppedAreaIndependent, 0) / rows.length).toFixed(2),
  cases_independent_area_gt_1pct: rows.filter((r) => r.droppedAreaIndependent > 1).map((r) => r.id + ':' + r.droppedAreaIndependent + '%'),
  cases_independent_area_gt_5pct: rows.filter((r) => r.droppedAreaIndependent > 5).map((r) => r.id + ':' + r.droppedAreaIndependent + '%'),
};
writeJson('04-dropped-attribution.json', { at: new Date().toISOString(), summary: sum, rows });

console.log('=== 04 被丢色归因 ===');
console.log('被丢色共 ' + sum.totalDropped + ' 个');
console.log('  其中与最近保留色 ΔE<10（同一色族，肉眼几乎不可分）：' + sum.nNearDup + ' 个');
console.log('  其中 ΔE≥10 且有 :root 角色名（真正独立的第 5+ 种色）：' + sum.nIndependent + ' 个');
console.log('');
console.log('平均面积：被丢色合计 ' + sum.meanDroppedAll + '% → 其中独立色部分仅 ' + sum.meanDroppedIndependent + '%');
console.log('独立被丢色面积 >1% 的案：' + (sum.cases_independent_area_gt_1pct.join(' ') || '无'));
console.log('独立被丢色面积 >5% 的案：' + (sum.cases_independent_area_gt_5pct.join(' ') || '无'));
console.log('');
console.log(mdTable(['案', '被丢色', '面积%', '最近保留色', 'ΔE', ':root 角色名', '独立?'],
  rows.flatMap((r) => r.detail.map((d) => [r.id, d.hex, d.areaPct, d.nearestKept, d.nearestKeptDE,
    d.hasRole ? d.roleNames.join(' ') : '（无声明）', d.independent ? '✓ 独立' : (d.distinct ? '色族不同但无角色名' : '近邻噪声')]))));
console.log('');
console.log('→ deliverables/71-plan/facts/04-dropped-attribution.json');
