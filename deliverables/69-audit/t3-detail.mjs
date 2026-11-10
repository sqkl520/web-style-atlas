// 任务 3 探针 C：U 类明细（按 reason 聚合）+ 修正 U3。
//
// 修正 U3：任务书给的例子「S28 16 栏放 12 块，最小 2 栏 → 12×2>16」**不成立**。
// 我数了原型：4 个 .row，每行 3 块，每行 span 合计恰好 16（7+5+4 / 2+7+7 / 6+3+7 / 4+5+7）。
// 只有假定"12 块同一行"才矛盾，而原型明明是 4 行。所以我把 U3 从"实例"降级为
// "**潜在**风险：提示词没写清块是分行排的，AI 可能按单行理解"，并单独标注它的证据等级。
import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'D:/Web/style/deliverables/69-audit';
const j = JSON.parse(readFileSync(OUT + '/t3-uclass.json', 'utf8'));

// 移除被证伪的 U3 实例
const hits = j.hits.filter((h) => h.code !== 'U3');
const removed = j.hits.filter((h) => h.code === 'U3');

const byReason = {};
for (const h of hits) {
  const k = h.code + '｜' + h.reason;
  byReason[k] = byReason[k] || { code: h.code, reason: h.reason, n: 0, cases: new Set() };
  byReason[k].n++;
  byReason[k].cases.add(h.id);
}
const rows = Object.entries(byReason).map(([k, v]) => ({ ...v, cases: [...v.cases].sort() }))
  .sort((a, b) => a.code.localeCompare(b.code) || b.n - a.n);

console.log('=== U 类明细（按判据聚合，U3 已剔除被证伪的实例）===');
let cur = '';
for (const r of rows) {
  if (r.code !== cur) { cur = r.code; console.log('\n【' + cur + '】'); }
  console.log('  ' + String(r.n).padStart(3) + ' 条 / ' + String(r.cases.length).padStart(2) + ' 案  ' +
    (r.cases.length <= 8 ? r.cases.join(',') : r.cases.length + ' 案（全量）') + '  ' + r.reason);
}

const byCode = {};
for (const h of hits) (byCode[h.code] = byCode[h.code] || new Set()).add(h.id + '\u0000' + h.reason);
const uniqReasonPerCode = {};
for (const h of hits) (uniqReasonPerCode[h.code] = uniqReasonPerCode[h.code] || new Set()).add(h.reason);

const flagged = new Set(hits.map((h) => h.id + '\u0000' + h.reason));
const flaggedCases = new Set(hits.map((h) => h.id));
console.log('\n=== 汇总（分母 = 1011 条去重约束）===');
for (const code of ['U1', 'U2', 'U3', 'U4', 'U5', 'U6']) {
  const n = hits.filter((h) => h.code === code).length;
  const cs = new Set(hits.filter((h) => h.code === code).map((h) => h.id));
  console.log(code, String(n).padStart(3), '条 /', String(cs.size).padStart(2), '案');
}
console.log('\n被证伪并剔除：');
removed.forEach((r) => console.log('  ' + r.id + ' | ' + r.reason));

// 严格口径：只算**独立缺陷**（同一案同一判据只算一次）
const indep = new Map();
for (const h of hits) {
  const k = h.id + '\u0000' + h.reason;
  if (!indep.has(k)) indep.set(k, h);
}
console.log('\n独立缺陷实例（同案同判据去重）：', indep.size);
console.log('涉及案数：', flaggedCases.size, '/30');

writeFileSync(OUT + '/t3-detail.json', JSON.stringify({
  rows: rows.map((r) => ({ ...r, cases: r.cases })),
  byCodeSummary: Object.fromEntries(['U1', 'U2', 'U3', 'U4', 'U5', 'U6'].map((c) => [c, {
    n: hits.filter((h) => h.code === c).length,
    cases: [...new Set(hits.filter((h) => h.code === c).map((h) => h.id))].sort(),
    reasons: [...(uniqReasonPerCode[c] || [])],
  }])),
  removedU3: removed,
  nIndep: indep.size,
  nItems: j.nUniq,
}, null, 1), 'utf8');
