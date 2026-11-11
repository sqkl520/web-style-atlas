// 探针 21：最终规则 —— 以仓库自己的 check-distribution TARGETS 为地板，叠加 buildPrompt 真实分岔点
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8'), ctx);
const S = ctx.window.SCHEMES;

// 复刻 check-distribution.mjs 的 hsl 与 band（同口径才能对齐仓库自己的地板）
const rgbOf = (h) => {
  const m = String(h).replace('#', '');
  const f = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
};
function hslOf([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const enriched = S.map(s => {
  const hsl = s.bg ? hslOf(rgbOf(s.bg)) : null;
  return { id: s.id, bg: s.bg, hue: hsl ? hsl.h : null, hslL: hsl ? hsl.l : null, band: s.axes.band, chroma: s.axes.chroma };
});

console.log('=== bright-purple 判据（hue 260–320 且 hslL≥60）===');
const purples = enriched.filter(r => r.hue !== null && r.hue >= 260 && r.hue <= 320 && r.hslL >= 60);
console.log(purples.map(r => `${r.id} bg=${r.bg} hue=${r.hue} L=${r.hslL}`).join(' | ') || '(none)');

console.log('\n=== mid-lightness band 判据 ===');
console.log(enriched.filter(r => r.band === '中间明度带').map(r => r.id).join(' '));

console.log('\n=== very-quiet (chroma<=25) ===');
console.log(enriched.filter(r => r.chroma <= 25).map(r => `${r.id}(${r.chroma})`).join(' '));

console.log('\n=== 全库 hue 分布（找空桶）===');
const buckets = {};
for (const r of enriched) { if (r.hue === null) continue; const b = Math.floor(r.hue / 30) * 30; buckets[b] = (buckets[b] || 0) + 1; }
console.log(Object.keys(buckets).map(Number).sort((a, b) => a - b).map(b => `${b}-${b + 29}:${buckets[b]}`).join(' '));

console.log('\n=== 当前 6 个空桶（Q2 前的问题）对照 ===');
for (const b of [240, 270, 300, 330]) console.log(`${b}-${b + 29}: ${buckets[b] || 0} 案`);
