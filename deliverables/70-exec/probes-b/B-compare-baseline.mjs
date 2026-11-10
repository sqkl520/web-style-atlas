#!/usr/bin/env node
/* EXEC-B：用**基线**（backup-b/dna-clean.json，即我进场时仓库里的状态）对照权威实测，
 * 复查 Lead 报的 15/30 与 12/30。三个口径并排：
 *   baseline   —— 我进场时的 dna-clean.json（Lead 量的就是这一份）
 *   currentA   —— Agent A 改完 clean-dna.mjs 后的当前产物
 *   truth      —— 本目录 B-linewidth-truth.mjs 实测（含 <use> 实例化）
 * 这样能把"Lead 的数字对不对"和"Agent A 的修法有没有解决问题"分成两个问题回答。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const truth = JSON.parse(readFileSync(join(ROOT, 'deliverables/70-exec/probes-b/linewidth-truth-30.json'), 'utf8'));
const load = (p) => {
  const j = JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
  return new Map((Array.isArray(j) ? j : Object.values(j)).map((e) => [e.id, e]));
};
const base = load('deliverables/70-exec/backup-b/dna-clean.json');
const cur = load('prototypes/_prompts/dna-clean.json');

const nums = (s) => String(s || '').match(/[0-9.]+/g)?.map(Number) || [];

function evalSet(claimed, t) {
  const ghost = claimed.filter((c) => !t.actual.some((x) => Math.abs(x - c) <= 0.05));
  const missedMajor = t.major.filter((x) => !claimed.some((c) => Math.abs(c - x) <= 0.05));
  const missedAll = t.actual.filter((x) => !claimed.some((c) => Math.abs(c - x) <= 0.05));
  return { ghost, missedMajor, missedAll };
}

const out = [];
for (const sid of Object.keys(truth).sort()) {
  const t = truth[sid];
  const b = nums(base.get(sid)?.lineWidths);
  const c = nums(cur.get(sid)?.lineWidths);
  out.push({ sid, claimedBase: b, claimedCur: c, ...{ actual: t.actual, major: t.major },
    base: evalSet(b, t), cur: evalSet(c, t) });
}

console.log('=== 基线（Lead 量的那一份）vs 权威实测 ===');
console.log('案   声称                                  实测                               超纲      假声称');
let bOver = 0, bGhost = 0, bMajor = 0;
for (const r of out) {
  if (r.base.ghost.length) bGhost++;
  if (r.base.missedAll.length) bOver++;
  if (r.base.missedMajor.length) bMajor++;
  console.log(
    r.sid.padEnd(4) + (r.claimedBase.join(',') || '—').padEnd(36) +
    r.actual.map((x) => x + '×' + truth[r.sid].counts[x]).join(' ').padEnd(34) +
    (r.base.missedAll.length ? '✗' + r.base.missedAll.join(',') : '✓').padEnd(14) +
    (r.base.ghost.length ? '✗' + r.base.ghost.join(',') : '✓')
  );
}
console.log(`\n【基线】用到声称之外的线宽（=Lead 的"15/30"）: ${bOver}/30`);
console.log(`【基线】声称了但页面没用到（=Lead 的"12/30"）: ${bGhost}/30`);
console.log(`【基线】主要线宽(≥10次)漏讲:                  ${bMajor}/30`);

console.log('\n\n=== 当前（Agent A 改完后）vs 权威实测 ===');
console.log('案   声称                                  实测                               超纲      假声称');
let cOver = 0, cGhost = 0, cMajor = 0;
for (const r of out) {
  if (r.cur.ghost.length) cGhost++;
  if (r.cur.missedAll.length) cOver++;
  if (r.cur.missedMajor.length) cMajor++;
  console.log(
    r.sid.padEnd(4) + (r.claimedCur.join(',') || '—').padEnd(36) +
    r.actual.map((x) => x + '×' + truth[r.sid].counts[x]).join(' ').padEnd(34) +
    (r.cur.missedAll.length ? '✗' + r.cur.missedAll.join(',') : '✓').padEnd(14) +
    (r.cur.ghost.length ? '✗' + r.cur.ghost.join(',') : '✓')
  );
}
console.log(`\n【当前】超纲: ${cOver}/30   假声称: ${cGhost}/30   漏讲主要: ${cMajor}/30`);

console.log('\n=== 两个口径的差值（baseline - current 的违例数）===');
console.log(`  超纲    ${bOver} → ${cOver}`);
console.log(`  假声称  ${bGhost} → ${cGhost}`);
console.log(`  漏主要  ${bMajor} → ${cMajor}`);
