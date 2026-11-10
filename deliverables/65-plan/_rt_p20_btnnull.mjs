// 探针 20：buttonText 为空的 13 案，主色对「白字/黑字」两边对比度是否都过 AA。
// 若是，则 buttonText=null 是**正确**的：作者没有可判定的单一答案，留空比瞎填对。
import { loadData } from './_rt_lib.mjs';

const D = loadData();
const rgbOf = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lum = (c) => { if (!c) return null; const s = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
const ratio = (a, b) => { const A = lum(rgbOf(a)), B = lum(rgbOf(b)); if (A == null || B == null) return null; const hi = Math.max(A, B), lo = Math.min(A, B); return (hi + 0.05) / (lo + 0.05); };

console.log('=== buttonText 为空的 ' + D.filter((x) => !x.buttonText).length + ' 案：主色对白/黑两边对比度 ===');
console.log('案    primary   白字对比  黑字对比    差   两侧都过 AA(4.5)?  判定');
let bothPass = 0, ambiguous = 0;
for (const r of D.filter((x) => !x.buttonText)) {
  const w = ratio(r.primary, '#FFFFFF'), b = ratio(r.primary, '#111111');
  const ok = w >= 4.5 && b >= 4.5;
  if (ok) bothPass++;
  if (Math.abs(w - b) < 1.2) ambiguous++;
  console.log(`${r.id}  ${r.primary}  ${w.toFixed(2).padStart(8)}  ${b.toFixed(2).padStart(8)}  ${Math.abs(w - b).toFixed(2).padStart(5)}  ${(ok ? '是' : '否').padEnd(16)} ${ok ? '无唯一答案' : ''}`);
}
console.log('');
console.log(`两侧都过 AA 的：${bothPass}/13 —— 这些案「白字黑字都合规」，作者不指定是对的`);
console.log(`两边对比度相差 <1.2 的：${ambiguous}/13 —— 连"哪个更好"都判不出来`);

console.log('');
console.log('=== 全部 30 案：buttonText 若是 null，UI 会显示什么？ ===');
console.log('app.js 的 field() 对空值返回空串（L380-382）⇒ 13 案会整块不渲染。');
console.log('若强行"接通"，这 13 案要么显示空、要么得由 CSS 现算 —— 而现算就是 palette[1] 的函数，等于重复。');
