/* 核实 FACTS §6 表里「尚未修」的四项，逐项用当前 HEAD 的数据判定真假。
 *
 *   ① app.js 的 paletteLine() 是否仍靠「位置」猜角色（p[0]=底色 / p[1]=主色）
 *   ② prompts.js 的 dna 里有没有 bg（缺则下游只能靠 palette[0] 猜）
 *   ③ data.js 有没有 radius / shadow / lineWidths（选型台看不到这三项）
 *   ④ data.js 的 palette 截断上限 4：截掉的是「规格外的派生色」还是「规格内的声明色」
 */
import { readFileSync } from 'node:fs';

const R = new URL('../../prototypes/', import.meta.url);
const app = readFileSync(new URL('_selection/app.js', R), 'utf8');
const pc = readFileSync(new URL('_selection/prompt-copy.js', R), 'utf8');
const dataSrc = readFileSync(new URL('_selection/data.js', R), 'utf8');
const promptSrc = readFileSync(new URL('_selection/prompts.js', R), 'utf8');

const data = JSON.parse(dataSrc.match(/=\s*(\[\s*\{[\s\S]*\}\])\s*;?\s*$/)[1]);

/* ── ① paletteLine 是否用位置 ── */
const fnStart = app.indexOf('function paletteLine');
console.log('═══ ① app.js paletteLine() ═══');
console.log(app.slice(fnStart, fnStart + 1200).split('\n').slice(0, 30).map((l, i) => `  ${i}: ${l}`).join('\n'));

/* ── ② prompts.js dna 有没有 bg ── */
const st = promptSrc.indexOf('window.STYLE_PROMPTS');
const sp = JSON.parse(promptSrc.slice(promptSrc.indexOf('{', st)).replace(/;\s*$/, ''));
const keys = new Set();
for (const s of sp.schemes) for (const k of Object.keys(s.dna || {})) keys.add(k);
console.log('\n═══ ② prompts.js dna 字段 ═══');
console.log('  ', [...keys].join(', '));
console.log('  有 bg ?', keys.has('bg'));

/* ── ③ data.js 字段 ── */
const dkeys = new Set();
for (const r of data) for (const k of Object.keys(r)) dkeys.add(k);
console.log('\n═══ ③ data.js 字段 ═══');
console.log('  ', [...dkeys].join(', '));
for (const k of ['radius', 'shadow', 'lineWidths', 'h1Size', 'bodySize', 'bg']) {
  console.log(`   ${k.padEnd(12)}`, dkeys.has(k) ? '有' : '✗ 缺');
}

/* ── ④ 截断丢掉的是什么 ── */
const specP3 = (id) => {
  const p = `_specs/${id}.md`;
  let t;
  try { t = readFileSync(new URL(p, R), 'utf8'); } catch { return null; }
  const i = t.indexOf('配色系统');
  if (i < 0) return null;
  let seg = t.slice(i, i + 900);
  const j = seg.indexOf('\n\n');
  if (j > 0 && j < 260) seg = seg.slice(0, j);
  const out = [];
  for (const m of seg.matchAll(/(#[0-9A-Fa-f]{6})/g)) out.push(m[1].toUpperCase());
  return [...new Set(out)];
};

console.log('\n═══ ④ data.js 的 4 色 vs 规格字段 3 声明的色 ═══');
let exact = 0;
for (const r of data) {
  const spec = specP3(r.id);
  const pal = (r.palette || []).map((h) => h.toUpperCase());
  const inSpec = pal.filter((h) => spec && spec.includes(h)).length;
  const mark = spec && pal.length === spec.length && inSpec === pal.length ? '✓' : '';
  if (mark) exact++;
  console.log(`  ${r.id}  data=${pal.length} 规格=${spec ? spec.length : '?'}  在规格内=${inSpec}  ${mark}`);
}
console.log(`  完全等于规格: ${exact}/30`);
