// 复核 REPORT 里所有通过率算术，并对每条 FAIL 打印归因类别，确保报告与 verdicts.json 一致。
import { readFileSync } from 'node:fs';
const v = JSON.parse(readFileSync('D:/Web/style/deliverables/69-test/_staging/verdicts.json', 'utf8'));
let tp = 0, tf = 0;
for (const id of ['S20', 'S21', 'S28']) {
  const rows = v.results[id];
  const p = rows.filter((r) => r.verdict === 'PASS').length;
  const f = rows.filter((r) => r.verdict === 'FAIL').length;
  const i = rows.filter((r) => r.verdict === 'INFO').length;
  tp += p; tf += f;
  console.log(`${id}: PASS=${p} FAIL=${f} INFO=${i} total=${rows.length} rate=${(p / (p + f) * 100).toFixed(1)}%  | 报告写的 ${v.summary[id].pass}/${v.summary[id].total} ${v.summary[id].rate}`);
  const fails = rows.filter((r) => r.verdict === 'FAIL').map((r) => r.id);
  if (fails.length) console.log(`     FAIL 条目: ${fails.join(', ')}`);
}
console.log(`\n合计 PASS=${tp} FAIL=${tf} 通过率=${(tp / (tp + tf) * 100).toFixed(1)}%  (报告写 65/71 = 91.5%)`);
// 扣掉两条「判据问题」(S20-M20, S21-M23)
const adj = `扣掉 S20-M20 与 S21-M23（归因 d）后: ${tp}/${tp + tf - 2} = ${(tp / (tp + tf - 2) * 100).toFixed(1)}%  (报告写 65/69 = 94.2%)`;
console.log(adj);
