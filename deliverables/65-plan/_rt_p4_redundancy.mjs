// 探针 4：三个"零消费"字段是不是冗余 —— primary / buttonText / scenesNo
// 判据：如果信息已在别的字段里，接通它们＝展示重复信息。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROTO, loadData } from './_rt_lib.mjs';

const D = loadData();
console.log('案数：' + D.length);
console.log('');

/* ── A. primary vs palette ───────────────────────────── */
console.log('=== A. primary 与 palette 的关系 ===');
let pEqBg = 0, pEqPal0 = 0, pInPal = 0, pNotInPal = 0, pIsPal1 = 0, pIsPal2plus = 0;
for (const r of D) {
  const pal = r.palette || [];
  if (r.primary === r.bg) pEqBg++;
  if (pal[0] === r.primary) pEqPal0++;
  if (pal.includes(r.primary)) { pInPal++; if (pal[1] === r.primary) pIsPal1++; else if (pal.indexOf(r.primary) > 1) pIsPal2plus++; }
  else pNotInPal++;
}
console.log(`primary === bg            : ${pEqBg}/30`);
console.log(`primary === palette[0]    : ${pEqPal0}/30`);
console.log(`primary ∈ palette         : ${pInPal}/30   （其中 =palette[1] 的 ${pIsPal1}，index>1 的 ${pIsPal2plus}）`);
console.log(`primary ∉ palette         : ${pNotInPal}/30`);
console.log('');
console.log('逐案：id  bg        primary   palette[0] palette[1]  primary在palette的位置');
for (const r of D) {
  const pal = r.palette || [];
  console.log(`${r.id}  ${String(r.bg).padEnd(9)} ${String(r.primary).padEnd(9)} ${String(pal[0]).padEnd(10)} ${String(pal[1]).padEnd(10)} idx=${pal.indexOf(r.primary)}`);
}

/* ── B. buttonText 分布 ──────────────────────────────── */
console.log('');
console.log('=== B. buttonText 取值分布 ===');
const bt = {};
for (const r of D) { const k = r.buttonText || '(null)'; bt[k] = (bt[k] || 0) + 1; }
for (const [k, v] of Object.entries(bt).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(2)}/30  ${k}`);

const white = D.filter((r) => r.buttonText === '#FFFFFF').length;
const black = D.filter((r) => r.buttonText === '#111111' || r.buttonText === '#000000').length;
const other = D.filter((r) => r.buttonText && r.buttonText !== '#FFFFFF' && r.buttonText !== '#111111' && r.buttonText !== '#000000');
const nul = D.filter((r) => !r.buttonText).length;
console.log(`\n  白 #FFFFFF: ${white}｜黑 #111111/#000000: ${black}｜null: ${nul}｜其它: ${other.length} → ${other.map((r) => r.id + '=' + r.buttonText).join(' ')}`);

// 白/黑能否由主色亮度算出？对比度判据：白字 vs 主色 ≥ 4.5:1 则白字合理
const rgbOf = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lum = (c) => { if (!c) return null; const s = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
const ratio = (a, b) => { const A = lum(rgbOf(a)), B = lum(rgbOf(b)); if (A == null || B == null) return null; const hi = Math.max(A, B), lo = Math.min(A, B); return (hi + 0.05) / (lo + 0.05); };

console.log('\n  用主色算应选白字还是黑字（WCAG 对比度更高者）：');
let agreeWhite = 0, agreeBlack = 0, disagree = 0, agreeNull = 0;
const dis = [];
for (const r of D) {
  if (!r.primary) continue;
  const cw = ratio(r.primary, '#FFFFFF'), cb = ratio(r.primary, '#111111');
  const pick = cw >= cb ? '#FFFFFF' : '#111111';
  const actual = r.buttonText || '(null)';
  const ok = actual === pick;
  if (!r.buttonText) agreeNull++;
  else if (ok) { if (pick === '#FFFFFF') agreeWhite++; else agreeBlack++; }
  else { disagree++; dis.push(`${r.id} primary=${r.primary} 实际=${actual} 算得=${pick} (白${cw.toFixed(2)}:1 黑${cb.toFixed(2)}:1)`); }
}
console.log(`  可由主色对比度推出的（白${agreeWhite} + 黑${agreeBlack}）= ${agreeWhite + agreeBlack}/30；不可推出(不一致) ${disagree}；空 ${agreeNull}`);
dis.forEach((d) => console.log('    ✗ ' + d));

/* ── C. scenesNo 是否已在 scenes 里 ───────────────────── */
console.log('');
console.log('=== C. scenesNo 是否为 scenes 的子串（即冗余） ===');
let sub = 0, notSub = 0, empty = 0;
const bad = [];
for (const r of D) {
  const scenes = String(r.scenes || '');
  const no = String(r.scenesNo || '');
  if (!no) { empty++; continue; }
  if (scenes.includes(no)) sub++;
  else { notSub++; bad.push(`${r.id} scenesNo="${no.slice(0, 30)}" 不在 scenes 里`); }
}
console.log(`scenesNo 为空: ${empty}/30｜是 scenes 的子串: ${sub}/30｜不是: ${notSub}/30`);
bad.forEach((b) => console.log('  ✗ ' + b));

console.log('');
console.log('=== S01 的 scenes / scenesYes / scenesNo 全文 ===');
const s01 = D.find((r) => r.id === 'S01');
console.log('scenes    (' + s01.scenes.length + '字): ' + s01.scenes);
console.log('scenesYes (' + s01.scenesYes.length + '字): ' + s01.scenesYes);
console.log('scenesNo  (' + s01.scenesNo.length + '字): ' + s01.scenesNo);
console.log('scenes 结尾是否含"不适合"： ' + /不适合/.test(s01.scenes) + '（出现在 index ' + s01.scenes.indexOf('不适合：') + '）');
