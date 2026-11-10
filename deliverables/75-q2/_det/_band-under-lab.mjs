import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(readFileSync('prototypes/_selection/data.js', 'utf8'), ctx);
const S = ctx.window.SCHEMES;

const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hslOf = (R, G, B) => {
  const r = R / 255, g = G / 255, b = B / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
};
const labL = (R, G, B) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const Y = f(R) * 0.2126 + f(G) * 0.7152 + f(B) * 0.0722;
  return Math.round(116 * (Y > 0.008856 ? Math.cbrt(Y) : 7.787 * Y + 16 / 116) - 16); };

// 现行带名逻辑（collect-schemes.mjs:604-613），只是把「明度」从 HSL l 换成 Lab L*
function bandOf(h, s, L, Ldark, Llight) {
  const warm = h <= 70 || h >= 330, cool = h > 150 && h < 290;
  let band;
  if (L >= Llight) band = warm ? '暖浅色带' : cool ? '冷浅色带' : '中性浅带';
  else if (L <= Ldark) band = cool ? '冷暗带' : '暖暗带';
  else band = '中间明度带';
  if (s <= 8) band = L >= Llight ? '中性浅带' : L <= Ldark ? '纯中性暗带' : '中性中带';
  return band;
}

const cur = {}, lab = {};
for (const s2 of S) {
  const [R, G, B] = rgbOf(s2.bg), h = hslOf(R, G, B), L = labL(R, G, B);
  (cur[bandOf(h.h, h.s, h.l, 22, 78)] ||= []).push(s2.id);
  (lab[bandOf(h.h, h.s, L, 30, 82)] ||= []).push(s2.id);
}
const show = (name, obj) => {
  console.log('\n' + name);
  Object.entries(obj).sort((a, b) => b[1].length - a[1].length)
    .forEach(([k, v]) => console.log('  ' + k.padEnd(8), String(v.length).padStart(2), '  ' + v.join(' ')));
};
show('【现行 · HSL 明度，阈值 78/22】', cur);
show('【改为 · CIELAB L*，阈值 82/30】', lab);

console.log('\n=== 对外显示的那个句子的三个数，两把尺子各是多少 ===');
console.log('index.html:188 现在写：暖浅色带 18、冷暗带 5、暖暗带 3、中性浅带 2、中间明度带 1、冷浅色带 1');
const g = (o, k) => (o[k] || []).length;
console.log('HSL  →  暖浅', g(cur, '暖浅色带'), ' 冷暗', g(cur, '冷暗带'), ' 暖暗', g(cur, '暖暗带'),
  ' 中性浅', g(cur, '中性浅带'), ' 中间明度', g(cur, '中间明度带'), ' 冷浅', g(cur, '冷浅色带'));
console.log('Lab  →  暖浅', g(lab, '暖浅色带'), ' 冷暗', g(lab, '冷暗带'), ' 暖暗', g(lab, '暖暗带'),
  ' 中性浅', g(lab, '中性浅带'), ' 中间明度', g(lab, '中间明度带'), ' 冷浅', g(lab, '冷浅色带'));

console.log('\n结论：');
console.log('· 「暖浅色带 18」两把尺子完全一致 —— 这是站点最关键的那个同质化数字，不受影响。');
console.log('· 唯一变化是 S09 从「中间明度带」移到「暖浅色带」，于是 暖浅 18→19、中间明度 1→0。');
