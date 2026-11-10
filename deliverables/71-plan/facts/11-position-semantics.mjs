/**
 * 11 · 两套 palette 的**位置语义**：这才是 Q2 真正的答案。
 *
 * 10 证明了"色族层面 data.js 基本没漏色"（不含 L1 色的面积平均仅 1.15%）。
 * 那么剩下的分歧就不是"少了色"，而是**同一个位置上放的是不同的东西**。
 *
 * 要检验的是：
 *   L1 的 palette[0] 是什么角色？  L3 的 palette[0] 是什么角色？
 *   UI 是否把位置当成角色来读？（app.js:963 硬编码 '底色 ' + p[0] + ' 主色 ' + p[1]）
 *
 * 若 L1 恒为"底色优先"、L3 为"主色优先"，那么：
 *   · 两套都"对"，但**位置不可互换** —— 这是 (b) 语义不同的最硬证据
 *   · 任何"让两者相等"的修法，若只改数据不改 UI 的角色假设，会直接把主色标成底色
 *
 * 运行：node deliverables/71-plan/facts/11-position-semantics.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  IDS, FACTS, loadData, loadPrompts, paletteOfData, paletteOfPrompts, writeJson, mdTable,
} from './lib.mjs';

const D = Object.fromEntries(loadData().rows.map((r) => [r.id, r]));
const P = Object.fromEntries(loadPrompts().doc.schemes.map((r) => [r.id, r]));
const px = Object.fromEntries(JSON.parse(readFileSync(join(FACTS, '03-pixels.json'), 'utf8')).rows
  .filter((r) => !r.error).map((r) => [r.id, r]));

/* UI 的角色假设：把 app.js 的相关行抓出来当证据，不靠记忆 */
const appjs = readFileSync(join(FACTS, '..', '..', '..', 'prototypes', '_selection', 'app.js'), 'utf8').split(/\r?\n/);
const paletteLineSrc = appjs.slice(955, 967).map((l, i) => ({ line: 956 + i, code: l.trim() })).filter((x) => x.code);

const rows = [];
for (const id of IDS) {
  const l1 = paletteOfData(D[id].palette);
  const l3 = paletteOfPrompts(P[id].dna.palette);
  const bg = (D[id].bg || '').toUpperCase();
  const prim = (D[id].primary || '').toUpperCase();
  const pct = px[id] ? px[id].pct : {};
  const byArea = Object.keys(pct).sort((a, b) => pct[b] - pct[a]);
  const areaTop1 = byArea[0] || null;

  const roleOf = (h) => {
    const r = [];
    if (h === bg) r.push('底色');
    if (h === prim) r.push('主色');
    if (h === areaTop1) r.push('面积最大');
    return r.length ? r.join('/') : '其它';
  };

  rows.push({
    id, l1, l3, bg, prim,
    L1_pos0: l1[0], L1_pos0_role: roleOf(l1[0]),
    L1_pos1: l1[1], L1_pos1_role: roleOf(l1[1]),
    L3_pos0: l3[0], L3_pos0_role: roleOf(l3[0]),
    L3_pos1: l3[1], L3_pos1_role: roleOf(l3[1]),
    L1_pos0_is_bg: l1[0] === bg,
    L3_pos0_is_bg: l3[0] === bg,
    L3_pos0_is_prim: l3[0] === prim,
    L1_pos1_is_prim: l1[1] === prim,
  });
}

const sum = {
  n: rows.length,
  L1_pos0_is_bg: rows.filter((r) => r.L1_pos0_is_bg).length,
  L1_pos1_is_prim: rows.filter((r) => r.L1_pos1_is_prim).length,
  L3_pos0_is_bg: rows.filter((r) => r.L3_pos0_is_bg).length,
  L3_pos0_is_prim: rows.filter((r) => r.L3_pos0_is_prim).length,
  L3_pos0_neither: rows.filter((r) => !r.L3_pos0_is_bg && !r.L3_pos0_is_prim).map((r) => r.id + ':' + r.L3_pos0 + '(' + r.L3_pos0_role + ')'),
  /* 若 UI 改读 L3，会把主色错标成底色的案数 */
  uiWouldMislabelBg: rows.filter((r) => !r.L3_pos0_is_bg).length,
  uiWouldMislabelPrim: rows.filter((r) => r.L3_pos1 !== r.prim).length,
  appjs_role_assumption: paletteLineSrc,
};
writeJson('11-position-semantics.json', { at: new Date().toISOString(), summary: sum, rows });

console.log('=== 11 palette 的位置语义 ===');
console.log('L1.palette[0] === 底色：' + sum.L1_pos0_is_bg + '/30   （L1 恒为「底色优先」）');
console.log('L1.palette[1] === 主色：' + sum.L1_pos1_is_prim + '/30');
console.log('L3.palette[0] === 底色：' + sum.L3_pos0_is_bg + '/30');
console.log('L3.palette[0] === 主色：' + sum.L3_pos0_is_prim + '/30   （L3 多为「主色优先」）');
console.log('L3.palette[0] 既非底色也非主色：' + sum.L3_pos0_neither.length + ' 案 → ' + (sum.L3_pos0_neither.join(' ') || '无'));
console.log('');
console.log('UI 的角色假设（app.js:956-966 原文）：');
for (const l of sum.appjs_role_assumption) console.log('  L' + l.line + '  ' + l.code);
console.log('');
console.log('⚠️ 若把 UI 改成直接读 L3（"让两者相等"的修法）：');
console.log('   palette[0] 会被标成「底色」，而它其实不是底色的案：' + sum.uiWouldMislabelBg + '/30');
console.log('   palette[1] 会被标成「主色」，而它其实不是主色的案：' + sum.uiWouldMislabelPrim + '/30');
console.log('');
console.log(mdTable(['案', 'L1[0]', '角色', 'L1[1]', '角色', 'L3[0]', '角色', 'L3[1]', '角色'],
  rows.map((r) => [r.id, r.L1_pos0, r.L1_pos0_role, r.L1_pos1, r.L1_pos1_role, r.L3_pos0, r.L3_pos0_role, r.L3_pos1, r.L3_pos1_role])));
console.log('');
console.log('→ deliverables/71-plan/facts/11-position-semantics.json');
