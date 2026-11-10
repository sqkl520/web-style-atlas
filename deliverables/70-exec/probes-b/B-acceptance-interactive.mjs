#!/usr/bin/env node
/* EXEC-B：交互口径的验收（静态数据版，不跑浏览器）。
 *
 * 为什么不用运行时 focus() 扫描：实测太慢（每案 120 个可聚焦元素 × 全 DOM 遍历，
 * 30 案跑不完）。而所需的数据**已经在手上**：
 *   linewidth-context.json 是我用 CSS 语境分类器（segment 级，区分 static/state/media）
 *   扫出来的每个 px 值及其所在选择器，stateVals 就是"只出现在交互态选择器里"的值。
 * 这条口径与运行时 focus() 的差别只有一处：它依赖"选择器带 :focus/:hover 等"这个静态判据，
 * 而不是"真的把焦点放上去看"。对 outline 这种"定义即生效"的属性，两者等价；
 * 对 S13 的 `.clause:hover .clause__head{ border-top-width:14.5px }` 也等价（悬停即生效）。
 *
 * 结论用途：回答一个具体问题 —— **A 的"保留交互态"口径下，验收过不过？**
 * 如果也过，那两套口径都合格，选择就只是产品判断，不涉及对错。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const truth = JSON.parse(readFileSync(join(ROOT, 'deliverables/70-exec/probes-b/linewidth-truth-30.json'), 'utf8'));
const ctxRows = JSON.parse(readFileSync(join(ROOT, 'deliverables/70-exec/probes-b/linewidth-context.json'), 'utf8'));
const ctx = new Map(ctxRows.map((r) => [r.sid, r]));
const dna = JSON.parse(readFileSync(join(ROOT, 'prototypes/_prompts/dna-clean.json'), 'utf8'));
const byId = new Map((Array.isArray(dna) ? dna : Object.values(dna)).map((e) => [e.id, e]));

const nums = (s) => String(s || '').match(/[0-9.]+/g)?.map(Number) || [];
const QUANT = (n) => Math.max(1, Math.floor(n));
const has = (arr, x) => arr.some((y) => Math.abs(x - y) <= 0.05);

const rows = [];
const fail = [];
for (const sid of Object.keys(truth).sort()) {
  const t = truth[sid];
  const c = ctx.get(sid) || { stateVals: [], staticVals: [] };
  /* 交互口径的"页面上能找到的集合" = 静态实测 ∪ CSS 里交互态声明的值 */
  const reachable = [...new Set([...t.actual, ...(c.stateVals || [])])].sort((a, b) => a - b);
  const claimed = nums(byId.get(sid)?.lineWidths);
  /* A：每个声称值必须能在 reachable 里找到（border 量化后也算） */
  const ghost = claimed.filter((x) => !has(reachable, x) && !has(reachable, QUANT(x)));
  /* B：主要线宽必须在声称值里 */
  const missedMajor = t.major.filter((x) => !claimed.some((y) => Math.abs(y - x) <= 0.05 || QUANT(y) === x));
  if (ghost.length || missedMajor.length) fail.push(sid);
  rows.push({ sid, claimed, reachable, ghost, missedMajor,
    fromState: claimed.filter((x) => !has(t.actual, x) && has(c.stateVals || [], x)) });
}

console.log('案   声称                                 可达集合(静态∪交互)                  A    B    其中来自交互态');
for (const r of rows) {
  console.log(
    r.sid.padEnd(4) + r.claimed.join(',').padEnd(36) + r.reachable.join(',').padEnd(36) +
    (r.ghost.length ? '✗' + r.ghost.join(',') : '✓').padEnd(5) +
    (r.missedMajor.length ? '✗' + r.missedMajor.join(',') : '✓').padEnd(5) +
    (r.fromState.join(',') || '—')
  );
}
console.log(`\n【交互口径】A∧B 全过: ${30 - fail.length}/30   违例: ${fail.join(' ') || '无'}`);
const withState = rows.filter((r) => r.fromState.length);
console.log(`声称里含"来自交互态"的值的案: ${withState.length}/30`);
for (const r of withState) console.log(`  ${r.sid}  ${r.fromState.join(',')}`);
writeFileSync(join(ROOT, 'deliverables/70-exec/probes-b/acceptance-interactive.json'), JSON.stringify({ rows, fail }, null, 1));
console.log('\n已写 acceptance-interactive.json');
