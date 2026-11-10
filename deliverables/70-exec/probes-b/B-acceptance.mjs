#!/usr/bin/env node
/* EXEC-B：把「当前 dna-clean.json 的声称值」对照「权威实测」逐案验一遍。
 * 验收标准（来自 Lead 的任务书）：
 *   A. 改写后每案声称值，必须能在该案页面上真实找到（±0.05px）
 *   B. 页面上的主要线宽（出现 ≥10 次）必须在声称值里
 * 两条分开报。A 罚"假声称"，B 罚"漏讲"。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const truth = JSON.parse(readFileSync(join(ROOT, 'deliverables/70-exec/probes-b/linewidth-truth-30.json'), 'utf8'));
const dna = JSON.parse(readFileSync(join(ROOT, 'prototypes/_prompts/dna-clean.json'), 'utf8'));
const byId = new Map((Array.isArray(dna) ? dna : Object.values(dna)).map((e) => [e.id, e]));

const rows = [];
let failA = [], failB = [];
for (const sid of Object.keys(truth).sort()) {
  const t = truth[sid];
  const claimed = String(byId.get(sid)?.lineWidths || '').match(/[0-9.]+/g)?.map(Number) || [];
  const actual = t.actual;
  const major = t.major;
  const ghost = claimed.filter((c) => !actual.some((x) => Math.abs(x - c) <= 0.05)); // A 违例
  const missedMajor = major.filter((x) => !claimed.some((c) => Math.abs(c - x) <= 0.05)); // B 违例
  const missedMinor = actual.filter((x) => !claimed.some((c) => Math.abs(c - x) <= 0.05) && !major.includes(x));
  if (ghost.length) failA.push(sid);
  if (missedMajor.length) failB.push(sid);
  rows.push({ sid, claimed, actual, major, ghost, missedMajor, missedMinor });
}

console.log('案   声称                                  实测                                 A:假声称  B:漏主要');
for (const r of rows) {
  console.log(
    r.sid.padEnd(4) + ' ' +
    (r.claimed.join(',') || '—').padEnd(37) + ' ' +
    r.actual.map((x) => x + '×' + truth[r.sid].counts[x]).join(' ').padEnd(34) + ' ' +
    (r.ghost.length ? '✗' + r.ghost.join(',') : '✓').padEnd(16) +
    (r.missedMajor.length ? '✗' + r.missedMajor.join(',') : '✓')
  );
}
console.log(`\nA 违例（声称了但页面没有）: ${failA.length}/30  ${failA.join(' ')}`);
console.log(`B 违例（主要线宽没声称）:   ${failB.length}/30  ${failB.join(' ')}`);
console.log(`两 A 两 B 全过:             ${30 - new Set([...failA, ...failB]).size}/30`);

writeFileSync(join(ROOT, 'deliverables/70-exec/probes-b/acceptance-now.json'), JSON.stringify({ rows, failA, failB }, null, 1));
console.log('\n已写 deliverables/70-exec/probes-b/acceptance-now.json');
