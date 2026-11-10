#!/usr/bin/env node
// Lead v22：把像素直方图按"接近调色板色"归并，算出真实面积配比
// 问题：S30 有 87947 种像素色（抗锯齿/纹理），S25 只有 840 种。直接数 hex 没意义。
// 正确做法：把每个像素归到最近的调色板色（CIE76 距离），算每档面积占比。
import { readFileSync } from 'node:fs';

const ROOT = 'D:/Web/style';
const pixel = JSON.parse(readFileSync(ROOT + '/deliverables/70-plan/pixel-ratio-30.json', 'utf8'));
const dna = JSON.parse(readFileSync(ROOT + '/prototypes/_prompts/dna-clean.json', 'utf8'));
const arr = Array.isArray(dna) ? dna : Object.values(dna);
const byId = new Map(arr.map((e) => [e.id, e]));

const HEXT = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
const norm = (h) => { h = h.toLowerCase(); return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h; };
const hexes = (s) => [...new Set([...String(s).matchAll(HEXT)].map((m) => norm(m[0])))];

function rgb(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
function srgbToLin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function toLab(hex) {
  const [r, g, b] = rgb(hex).map(srgbToLin);
  const X = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const Y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const Z = r * 0.0193 + g * 0.1192 + b * 0.9505;
  const fx = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const xr = fx(X / 0.95047), yr = fx(Y / 1.0), zr = fx(Z / 1.08883);
  return [116 * yr - 16, 500 * (xr - yr), 200 * (yr - zr)];
}
function dE(a, b) { return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2); }

console.log('=== 把像素色归并到最近的调色板色（CIE76），算真实面积占比 ===\n');
const out = {};
for (const [id, data] of Object.entries(pixel)) {
  const pal = hexes((byId.get(id)?.palette || []).join(' '));
  if (!pal.length) { console.log(`${id} 无调色板`); continue; }
  const palLab = pal.map((h) => ({ hex: h, lab: toLab(h) }));
  const sums = new Map(pal.map((h) => [h, 0]));
  let unassigned = 0, unassignedMax = 0;
  for (const c of data.top) {
    const lab = toLab(c.hex);
    let best = null, bestD = 1e9;
    for (const p of palLab) { const d = dE(lab, p.lab); if (d < bestD) { bestD = d; best = p.hex; } }
    // 距离 > 25 认为不属于任何调色板色（明显是另一种颜色/照片）
    if (bestD > 25) { unassigned += c.pct; unassignedMax = Math.max(unassignedMax, c.pct); }
    else sums.set(best, (sums.get(best) || 0) + c.pct);
  }
  // 注意：只用 top8 像素色，覆盖不全。标注覆盖率
  const covered = data.top.reduce((a, c) => a + c.pct, 0);
  const list = [...sums.entries()].filter(([, v]) => v > 0.01).sort((a, b) => b[1] - a[1]);
  out[id] = { pal, assigned: Object.fromEntries(list), unassigned: +unassigned.toFixed(1), covered: +covered.toFixed(1) };
  console.log(
    `${id}  top8覆盖${String(covered.toFixed(1)).padStart(5)}%  归并: ` +
    list.map(([h, v]) => `${h}=${v.toFixed(1)}%`).join(' ') +
    (unassigned > 0.5 ? `  ‖ 集合外${unassigned.toFixed(1)}%` : '') +
    (covered < 95 ? '  ⚠覆盖不足' : '')
  );
}

console.log('\n\n=== 与规格声称的占比对比（仅覆盖充足、且声称值存在的案）===\n');
console.log('说明：top8 像素色可能覆盖不到 100%，因此这里的"实际占比"是下限估计。\n');
for (const [id, o] of Object.entries(out)) {
  if (o.covered < 90) continue;
  const entries = Object.entries(o.assigned);
  const main = entries.sort((a, b) => b[1] - a[1])[0];
  if (!main) continue;
  console.log(`  ${id}  最大面积色 ${main[0]} 实测≈${main[1].toFixed(1)}%`);
}

import { writeFileSync } from 'node:fs';
writeFileSync(ROOT + '/deliverables/70-plan/pixel-ratio-mapped.json', JSON.stringify(out, null, 1));
console.log('\n已写 deliverables/70-plan/pixel-ratio-mapped.json');
