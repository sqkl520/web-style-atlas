// 5.6:1 到底属于哪一对颜色？以及 --link / --ink-3 的全部组合。
import { readFileSync } from 'node:fs';
const hex2rgb = (h) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = (h) => { const [r, g, b] = hex2rgb(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const cr = (a, b) => { const l1 = L(a), l2 = L(b); const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]; return +((hi + 0.05) / (lo + 0.05)).toFixed(2); };

const css = readFileSync('prototypes/_selection/style.css', 'utf8');
const vars = {};
for (const m of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) vars[m[1]] = m[2].toLowerCase();
console.log('调色板:', JSON.stringify(vars, null, 0));

const fgs = ['ink', 'ink-2', 'ink-3', 'link', 'fail', 'warn', 'pass'];
const bgs = ['ground', 'ground-2', 'card'];
console.log('\n对比度矩阵（WCAG 相对亮度）');
console.log('fg\\bg'.padEnd(8) + bgs.map((b) => b.padEnd(10)).join(''));
for (const f of fgs) {
  if (!vars[f]) continue;
  console.log(f.padEnd(8) + bgs.map((b) => fy(cr(vars[f], vars[b]))).join(''));
}
function fy(x) { const s = (x + ':1').padEnd(10); return x >= 4.5 ? s : s + '' ; }

console.log('\n哪些组合 ≈ 5.6:1（±0.15）？');
for (const f of [...fgs, 'rule', 'rule-2']) for (const b of bgs) {
  if (!vars[f] || !vars[b]) continue;
  const c = cr(vars[f], vars[b]);
  if (Math.abs(c - 5.6) <= 0.15) console.log(`  ${f}(${vars[f]}) on ${b}(${vars[b]}) = ${c}:1  ← 命中`);
}
console.log('\n旧 --ink-3 #6f6c64:');
for (const b of bgs) console.log(`  #6f6c64 on ${b}(${vars[b]}) = ${cr('#6f6c64', vars[b])}:1`);
console.log('\n当行 --ink-3 #56534b:');
for (const b of bgs) console.log(`  #56534b on ${b}(${vars[b]}) = ${cr('#56534b', vars[b])}:1`);
