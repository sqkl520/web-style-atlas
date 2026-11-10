// 只读普查：30 条 dna.mechanism 的长度分布与「带单位 token」覆盖。
import { readFileSync } from 'node:fs';
const sb = { window: {} };
new Function('window', readFileSync('D:/Web/style/prototypes/_selection/prompts.js', 'utf8'))(sb.window);
const P = sb.window.STYLE_PROMPTS;

// 与 _mech.mjs:14 完全同一口径，便于对照 blast radius
const MECH_RE = /(\d+(?:\.\d+)?)\s*(px|%|秒|栏|列|枚|档|度|°|deg|ch|vh|em)/g;
// 更宽的「数字」口径：任何数字（含 5:7 比例、0/12/24 斜杠表、1.5 无单位）
const ANYNUM_RE = /\d+(?:\.\d+)?/g;
// 比例/斜杠表：3fr、5:2:1、3/2/1/1、0/12/24px
const RATIO_RE = /\d+\s*[:/]\s*\d+(?:\s*[:/]\s*\d+)*/g;
// 裸长度词（无数字但语义是尺度）
const UNITWORD_RE = /(倍|级|档|栏|列|行|层|枚|列宽|行高|基线|栏距|外距|中缝)/g;

const rows = [];
for (const s of P.schemes) {
  const m = s.dna.mechanism || '';
  const unitToks = [...m.matchAll(MECH_RE)].map((x) => x[0].replace(/\s+/g, ''));
  const anyNums = [...m.matchAll(ANYNUM_RE)].map((x) => x[0]);
  const ratios = [...m.matchAll(RATIO_RE)].map((x) => x[0].replace(/\s+/g, ''));
  const unitWords = [...m.matchAll(UNITWORD_RE)].map((x) => x[0]);
  rows.push({ id: s.id, len: m.length, unitToks, anyNums, ratios, unitWords, text: m });
}
rows.sort((a, b) => a.id.localeCompare(b.id));

const pad = (x, n) => String(x).padEnd(n);
console.log('id   len  unitToks  anyNums  ratios  unitWords');
for (const r of rows) {
  console.log(
    pad(r.id, 5), pad(r.len, 4), pad(r.unitToks.length, 9), pad(r.anyNums.length, 8),
    pad(r.ratios.length, 7), pad(r.unitWords.length, 9),
    r.unitToks.join(',') || '—'
  );
}

const lens = rows.map((r) => r.len).sort((a, b) => a - b);
const sum = (a, f) => a.reduce((x, y) => x + f(y), 0);
const mean = sum(lens, (x) => x) / lens.length;
const sd = Math.sqrt(sum(lens, (x) => (x - mean) ** 2) / lens.length);

console.log('\n== 长度分布 ==');
console.log(`n=${lens.length} min=${lens[0]} p25=${lens[Math.floor(lens.length * 0.25)]} median=${lens[Math.floor(lens.length / 2)]} p75=${lens[Math.floor(lens.length * 0.75)]} max=${lens[lens.length - 1]} mean=${mean.toFixed(1)} sd=${sd.toFixed(1)}`);

const withUnit = rows.filter((r) => r.unitToks.length > 0);
const noUnit = rows.filter((r) => r.unitToks.length === 0);
const noAnyNum = rows.filter((r) => r.anyNums.length === 0);
const noUnitButNum = rows.filter((r) => r.unitToks.length === 0 && r.anyNums.length > 0);
const onlyRatio = rows.filter((r) => r.ratios.length > 0 && r.unitToks.length === 0);

console.log('\n== 覆盖 ==');
console.log(`带单位 token（_mech 口径）的案: ${withUnit.length}/${rows.length}  → ${withUnit.map((r) => r.id).join(' ')}`);
console.log(`完全无单位 token 的案:        ${noUnit.length}/${rows.length}  → ${noUnit.map((r) => r.id).join(' ')}`);
console.log(`  其中「有阿拉伯数字但无单位」: ${noUnitButNum.length} → ${noUnitButNum.map((r) => r.id).join(' ') || '—'}`);
console.log(`  其中「含比例/斜杠表」:        ${onlyRatio.length} → ${onlyRatio.map((r) => r.id).join(' ') || '—'}`);
console.log(`完全无任何阿拉伯数字的案:      ${noAnyNum.length}/${rows.length} → ${noAnyNum.map((r) => r.id).join(' ') || '—'}`);
console.log(`单位 token 总数: ${sum(rows, (r) => r.unitToks.length)}；任一数字总数: ${sum(rows, (r) => r.anyNums.length)}；比例表总数: ${sum(rows, (r) => r.ratios.length)}`);

const unitKinds = {};
for (const r of rows) for (const t of r.unitToks) {
  const u = t.replace(/^[\d.]+/, '');
  unitKinds[u] = (unitKinds[u] || 0) + 1;
}
console.log('\n== 单位种类 ==');
for (const [u, c] of Object.entries(unitKinds).sort((a, b) => b[1] - a[1])) console.log(`  ${u.padEnd(6)} ${c}`);
