import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(readFileSync('prototypes/_selection/data.js', 'utf8'), ctx);
vm.runInContext(readFileSync('prototypes/_selection/prompts.js', 'utf8'), ctx);
const S = ctx.window.SCHEMES, P = ctx.window.STYLE_PROMPTS.schemes;

const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hslOf = (R, G, B) => {
  const r = R / 255, g = G / 255, b = B / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; }
  return { h, s: s * 100, l: l * 100 };
};
const labL = (R, G, B) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const Y = f(R) * 0.2126 + f(G) * 0.7152 + f(B) * 0.0722;
  return (116 * (Y > 0.008856 ? Math.cbrt(Y) : 7.787 * Y + 16 / 116) - 16); };

const rows = S.map((s, i) => {
  const [R, G, B] = rgbOf(s.bg), h = hslOf(R, G, B), L = labL(R, G, B);
  const c = P[i].capacity || {};
  return { id: s.id, bg: s.bg, hue: Math.round(h.h), sat: Math.round(h.s), hslL: Math.round(h.l), labL: Math.round(L),
    chroma: s.axes.chroma, loud: s.axes.loud, band: s.axes.band, minItems: c.minItems, minPics: c.minPics };
});

const report = (label, list, note) => {
  console.log('\n【' + label + '】' + (note ? '  ' + note : ''));
  console.log(list.length ? '  ' + list.join(' ') : '  （0 案）');
};

console.log('=== Q2 五项缺口：三种口径各算一遍 ===');
for (const [name, test] of [
  ['中间明度（HSL l 23–77，现行判据）', (r) => r.hslL > 22 && r.hslL < 78],
  ['中间明度（CIELAB L* 31–81）', (r) => r.labL > 30 && r.labL < 82],
  ['亮底紫（hue 260–320 且 明度≥60）', (r) => r.hue >= 260 && r.hue <= 320 && r.hslL >= 60],
  ['亮底紫（hue 260–320 且 CIELAB L*≥60）', (r) => r.hue >= 260 && r.hue <= 320 && r.labL >= 60],
  ['很安静（chroma ≤ 25，现行判据）', (r) => r.chroma <= 25],
  ['很安静（调色板最高饱和 ≤25）', (r) => r.chroma <= 25],
  ['少货少图（minPics ≤ 2）', (r) => r.minPics <= 2],
  ['少货少图（minPics ≤ 4）', (r) => r.minPics <= 4],
]) report(name, rows.filter(test).map((r) => `${r.id}(${r.bg},L${r.hslL}/L*${r.labL},hue${r.hue},minPics${r.minPics})`));

console.log('\n=== 全库 minPics / minItems 分布 ===');
const mp = {}; rows.forEach((r) => (mp[r.minPics] = (mp[r.minPics] || 0) + 1));
console.log('minPics:', Object.entries(mp).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}图×${v}案`).join('  '));
const mi = {}; rows.forEach((r) => (mi[r.minItems] = (mi[r.minItems] || 0) + 1));
console.log('minItems:', Object.entries(mi).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}项×${v}案`).join('  '));

console.log('\n=== 色相覆盖（看"没有哪个色相"）===');
const buckets = {};
rows.forEach((r) => { const b = Math.floor(r.hue / 30) * 30; (buckets[b] = buckets[b] || []).push(r.id); });
for (let b = 0; b < 360; b += 30) console.log(String(b).padStart(3) + '–' + String(b + 29).padStart(3), (buckets[b] || []).length ? buckets[b].join(' ') : '—— 空');

console.log('\n=== ground 与 band 的交叉核对（S09 是唯一矛盾案）===');
console.log(rows.filter((r) => r.hslL <= 22 || r.hslL >= 78).length, '案在两端，', rows.filter((r) => r.hslL > 22 && r.hslL < 78).length, '案在中间');
