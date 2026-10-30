/* 核实 6e0ca82 的修复到底有没有用户可见效果。
 *
 * 修的是 dna.primary 的召回（9 案空 → 0 案空），但 primary 不被 build-prompts 透传。
 * 所以唯一可能的可见效果是：palette 的**顺序**变了（主色被推到前面）。
 * 若顺序也没变，那就是和 h1Size 一样的「修了个不接线的东西」。
 */
import { readFileSync } from 'node:fs';

const R = new URL('../../prototypes/', import.meta.url);
const dc = JSON.parse(readFileSync(new URL('_prompts/dna-clean.json', R), 'utf8'));
const rows = dc.rows || dc;

console.log('═══ 每案：primary 是否在 palette 里、排第几 ═══\n');
console.log('案    primary     位置   palette[0]   主色在首位?');
console.log('─'.repeat(72));
let atFirst = 0, atZero = 0;
for (const r of rows) {
  const pal = (r.palette || []).map((x) => String(x));
  const prim = (r.primary && r.primary[0]) ? String(r.primary[0]).toUpperCase() : '';
  const idx = pal.findIndex((p) => p.toUpperCase().includes(prim) && prim);
  const p0 = (pal[0] || '').toUpperCase();
  if (idx === 0) atFirst++;
  if (!prim) atZero++;
  console.log(`${r.id}  ${(prim || '(空)').padEnd(11)}  ${String(idx).padStart(4)}   ${p0.padEnd(11)}  ${idx === 0 ? '✓' : ''}`);
}
console.log(`\n主色排在 palette[0]: ${atFirst}/${rows.length}   primary 为空: ${atZero}/${rows.length}`);

/* 对照：prompts.js 里的 palette 顺序是否与 dna-clean 一致 */
const ps = readFileSync(new URL('_selection/prompts.js', R), 'utf8');
const sp = JSON.parse(ps.slice(ps.indexOf('{', ps.indexOf('window.STYLE_PROMPTS'))).replace(/;\s*$/, ''));
console.log('\n═══ prompts.js 的 palette 顺序是否沿用 dna-clean ═══');
let same = 0;
for (const s of sp.schemes) {
  const drow = rows.find((r) => r.id === s.id);
  const promptHexes = String(s.dna.palette).toUpperCase().match(/#[0-9A-F]{6}/g) || [];
  const cleanHexes = (drow.palette || []).map((x) => (String(x).match(/#[0-9A-F]{6}/i) || [''])[0].toUpperCase()).filter(Boolean);
  const eq = JSON.stringify(promptHexes) === JSON.stringify(cleanHexes);
  if (eq) same++;
  else console.log(`  ${s.id} 不等\n    prompts: ${promptHexes.join(' ')}\n    clean  : ${cleanHexes.join(' ')}`);
}
console.log(`  顺序一致: ${same}/30`);
