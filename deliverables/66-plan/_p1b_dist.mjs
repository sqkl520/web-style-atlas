// P1b：逐案看「结构约束」整段，并按 minItems 分档统计
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, median } from './_lib.mjs';

const out = JSON.parse(readFileSync(join(HERE, 'p1-prompts.json'), 'utf8'));
const num = (l) => +(String(l).match(/我实际有 (\d+) 个/)[1]);

const rows = out.map((o) => ({ id: o.id, n: num(o.line1), degrades: /手工排定/.test(o.structBlock || '') }));
console.log('== 计数分布 ==');
const ns = rows.map((r) => r.n).sort((a, b) => a - b);
console.log('min=%d med=%s max=%d  合计=%d', ns[0], median(ns), ns[ns.length - 1], ns.reduce((a, b) => a + b, 0));
for (const b of [[1, 5], [6, 10], [11, 15], [16, 20], [21, 30], [31, 99]]) {
  const g = rows.filter((r) => r.n >= b[0] && r.n <= b[1]);
  console.log(`  ${b[0]}–${b[1]}: ${g.length} 案  ${g.map((r) => r.id).join(' ')}`);
}
console.log('\n== 「就排 N 个」的 N ≥ 20 的案（用户几乎不可能真有这么多条目）==');
for (const r of rows.filter((x) => x.n >= 20)) console.log(`  ${r.id} N=${r.n} degrades(yes=手工定位)=${r.degrades}`);

console.log('\n== 全样本：S07 与 S29 的结构约束段原文 ==');
for (const id of ['S07', 'S29', 'S22']) {
  const o = out.find((x) => x.id === id);
  console.log('\n--- ' + id + ' ---');
  console.log(o.structBlock);
}
