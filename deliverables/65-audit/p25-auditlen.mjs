// 探针 25：字段 8 体量的正确定义 —— data.js 里 audit 字段长度 vs md 原始段落长度
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { ROOT, loadSchemes, readSpec, specIds, dec } from './lib-load.mjs';

const S = loadSchemes();
console.log('=== data.js 的 audit 字段（字段 8）逐案字数 ===');
const rows = S.map((r) => ({ id: r.id, len: (r.audit || '').length }));
for (const r of rows) console.log(`${r.id}\t${r.len}`);
const g = (a, b) => rows.filter((r) => +r.id.slice(1) >= a && +r.id.slice(1) <= b);
const avg = (a) => Math.round(a.reduce((s, r) => s + r.len, 0) / a.length);
console.log(`\nS01–S10 平均 ${avg(g(1, 10))} 字 (min ${Math.min(...g(1,10).map(r=>r.len))} / max ${Math.max(...g(1,10).map(r=>r.len))})`);
console.log(`S11–S20 平均 ${avg(g(11, 20))} 字 (min ${Math.min(...g(11,20).map(r=>r.len))} / max ${Math.max(...g(11,20).map(r=>r.len))})`);
console.log(`S21–S30 平均 ${avg(g(21, 30))} 字 (min ${Math.min(...g(21,30).map(r=>r.len))} / max ${Math.max(...g(21,30).map(r=>r.len))})`);
console.log(`全库 ${rows.reduce((a, r) => a + r.len, 0)} 字`);

console.log('\n=== 与任务描述的假设对照 ===');
console.log('任务描述：「S11–S20 各约 1800 字，S01–S10 各约 300 字」');
const s11_20 = g(11, 20).map((r) => r.len);
const s01_10 = g(1, 10).map((r) => r.len);
console.log(`S01–S10 实测区间 ${Math.min(...s01_10)}–${Math.max(...s01_10)}（描述「约 300」→ 吻合）`);
console.log(`S11–S20 实测区间 ${Math.min(...s11_20)}–${Math.max(...s11_20)}（描述「约 1800」→ 差 ${Math.round(1800 / avg(g(11,20)))} 倍）`);
console.log(`S21–S30 实测区间 ${Math.min(...g(21,30).map(r=>r.len))}–${Math.max(...g(21,30).map(r=>r.len))}（描述未提）`);
console.log(`最大/最小比：${(Math.max(...rows.map(r=>r.len)) / Math.min(...rows.map(r=>r.len))).toFixed(2)} 倍`);

console.log('\n=== 是否存在「约 1800 字」的任何字段？（找量级接近的）===');
const keys = [...new Set(S.flatMap((r) => Object.keys(r)))];
for (const k of keys) {
  const lens = S.map((r) => (typeof r[k] === 'string' ? r[k].length : 0));
  const a = Math.round(lens.reduce((x, y) => x + y, 0) / lens.length);
  const mx = Math.max(...lens);
  if (mx > 1200) console.log(`  ${k}: 平均 ${a} 字 / 最大 ${mx} 字`);
}
