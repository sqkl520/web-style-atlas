/* P3 断点探针（2026-10-31 锐评验收后重写第三版）。
 *
 * v1 的 bug：正则只抓 `@media` 里第一段 width，复合条件漏抓。
 * v2 的 bug：分母硬编码 `- 7`（从栏数探针抄的），真实应为 30。
 * v3 的 bug：固定切 1800 字符越界，把字段 8 的 `border-radius ≥ 100px`
 *            当成断点断言，导致报「S13 缺 100」这个假阳性。
 *
 * 本版：字段 5 切到下一个字段标记为止；分母用实际计数。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const dirs = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();

/** 字段 5 的切片：切到下一个字段标记（`6.`）为止，1800 字符兜底 */
function field5(md) {
  const i = md.indexOf('布局与网格');
  if (i < 0) return '';
  const rest = md.slice(i);
  const m = rest.slice(5).search(/\n\s*\*{0,2}6[\.．]?\s/);
  const end = m >= 0 ? Math.min(m + 5, 1800) : 1800;
  return rest.slice(0, end);
}

function specBreakpoints(md) {
  const seg = field5(md);
  if (!seg) return [];
  const out = new Set();
  for (const m of seg.matchAll(/[<≤>≥]\s*=?\s*(\d{3,4})\s*px/g)) out.add(+m[1]);
  for (const m of seg.matchAll(/(\d{3,4})\s*[–\-~]\s*(\d{3,4})\s*px/g)) {
    out.add(+m[1]);
    out.add(+m[2]);
  }
  return [...out].sort((a, b) => a - b);
}

function cssBreakpoints(css) {
  const out = new Set();
  for (const m of css.matchAll(/@media\s*([^{]+)\{/g)) {
    for (const w of m[1].matchAll(/(?:max|min)-width\s*:\s*(\d+)px/g)) out.add(+w[1]);
  }
  return [...out].sort((a, b) => a - b);
}

function specRanges(md) {
  const seg = field5(md);
  if (!seg) return [];
  const r = [];
  for (const m of seg.matchAll(/[≥>]\s*=?\s*(\d{3,4})\s*px/g)) r.push([+m[1], Infinity]);
  for (const m of seg.matchAll(/[<≤]\s*=?\s*(\d{3,4})\s*px/g)) r.push([0, +m[1] - 1]);
  for (const m of seg.matchAll(/(\d{3,4})\s*[–\-~]\s*(\d{3,4})\s*px/g)) r.push([+m[1], +m[2]]);
  return r.sort((a, b) => a[0] - b[0]);
}

console.log('案    规格断点              CSS 断点                       缺');
console.log('-'.repeat(90));
const bad = [];
let specHas = 0;

for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const sp = join(P, '_specs', id + '.md');
  if (!existsSync(sp)) continue;
  const md = readFileSync(sp, 'utf8');
  const sbp = specBreakpoints(md);
  if (!sbp.length) continue;
  specHas++;
  const cssPath = join(P, dir, 'style.css');
  const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : '';
  const cbp = cssBreakpoints(css);
  const missing = sbp.filter((b) => !cbp.some((c) => Math.abs(c - b) <= 1));
  console.log(`${id}  [${sbp.join(',')}]`.padEnd(26) + `[${cbp.join(',')}]`.padEnd(34) + (missing.length ? `缺 ${missing.join(',')}` : 'OK'));
  if (missing.length) bad.push({ id, sbp, cbp, missing, ranges: specRanges(md) });
}

console.log(`\n=== 汇总: ${specHas - bad.length}/${specHas} 全覆盖，${bad.length} 案有缺 ===`);

console.log('\n=== 逐案区间分析 ===\n');
for (const b of bad) {
  console.log(`${b.id}`);
  console.log(`  规格区间: ${b.ranges.map(([a, c]) => (c === Infinity ? `>=${a}` : a === 0 ? `<${c + 1}` : `${a}-${c}`)).join('  |  ')}`);
  console.log(`  CSS 断点: ${b.cbp.join(', ')}`);
  console.log(`  缺失的阈值: ${b.missing.join(', ')}`);
  /* 这个判定**只是"数字在不在"**，不等于"行为对不对"。
   * 2026-10-31 锐评打穿过一次：S08 缺 768 这个数字，但「<768 堆叠」这个行为
   * 被 `@media (max-width: 1023px)` 块（perspective:none + transform:none +
   * position:static）**超集覆盖**了。只数数字会把超集实现判成缺陷。 */
  console.log('  注意: 数字缺失 != 行为缺陷。必须打开对应 @media 块看它改了什么，');
  console.log('        一个更宽的断点可能已经用超集覆盖了较窄的要求（S08 即此情况）。');
  console.log('');
}
