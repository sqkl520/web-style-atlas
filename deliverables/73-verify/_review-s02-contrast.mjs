/* S02 的纹理挂 body，导致 contrast 规则整条失明（probe.mjs:282 `if (!bg) continue`）。
 *
 * 那么 S02 的 report 里 `lowContrast: 0` 到底意味着什么？
 * 本脚本算 S02 自己声明的调色板两两对比度，看有没有**本该被报出来**的低对比。
 */
import { readFileSync } from 'node:fs';

const F = 'D:/Web/style/prototypes/S02-gilded-symmetry-salon/style.css';
const css = readFileSync(F, 'utf8');

const vars = {};
for (const m of css.matchAll(/--([\w-]+)\s*:\s*(#[0-9A-Fa-f]{3,8})/g)) vars[m[1]] = m[2];

const lum = (hex) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const v = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

console.log('S02 声明的颜色变量：');
for (const [k, v] of Object.entries(vars)) console.log(`  --${k.padEnd(12)} ${v}`);

const grounds = ['card', 'band', 'dirty'].filter((g) => vars[g]);
console.log('\n=== 各文字色 vs 各地面色（4.5 = 正文门槛，3.0 = 大字号门槛）===');
const inks = ['ivory', 'ivory-2', 'gold', 'ink'];
for (const g of grounds) {
  for (const k of inks) {
    if (!vars[k]) continue;
    const r = ratio(vars[k], vars[g]);
    const flag = r < 3 ? '  ✗ 低于大字号门槛' : r < 4.5 ? '  ~ 低于正文门槛' : '';
    console.log(`  --${k.padEnd(8)} on --${g.padEnd(6)} ${vars[k]} / ${vars[g]} = ${r.toFixed(2)}:1${flag}`);
  }
}
console.log('\n注：这些是"声明值对声明值"的理论对比度，不是渲染实测。');
console.log('它的用途只有一个：说明 S02 的 lowContrast=0 不能当作"对比度没问题"的证据，');
console.log('因为纹理挂在 body 上时，probe.mjs:282 的 `if (!bg) continue` 会把整条检查跳过。');
