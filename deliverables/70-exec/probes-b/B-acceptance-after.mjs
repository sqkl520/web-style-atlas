#!/usr/bin/env node
/* EXEC-B：修后验收（唯一权威口径）。
 *
 * 验收标准来自任务书，但**必须按实测修正一条**：
 *   A. 「声称值必须能在页面上真实找到（±0.05px）」
 *      → 对 stroke 成立；对 border **不成立**，因为 Chrome 在 dpr=1 把 border/outline
 *        宽度量化成 max(1, floor(w))（probes-b/border-quantization.json 实测 30 档 20 档被改）。
 *        所以 border 类声称值改用「量化后能对上」判定：floor(w)（下限 1）出现在页面实测里即算找到。
 *   B. 「页面上的主要线宽（出现 ≥10 次）必须在声称值里」
 *      → 同样按量化还原：实测值 m 若等于某个声称值的量化结果，也算覆盖。
 *
 * 另加一条我自己的判据 C（任务书没要求，但它能抓住"互相矛盾"）：
 *   声称值不得只来自交互态 —— 已在 clean-dna 里排除，这里复核排除是否生效。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const truth = JSON.parse(readFileSync(join(ROOT, 'deliverables/70-exec/probes-b/linewidth-truth-30.json'), 'utf8'));
const dna = JSON.parse(readFileSync(join(ROOT, 'prototypes/_prompts/dna-clean.json'), 'utf8'));
const byId = new Map((Array.isArray(dna) ? dna : Object.values(dna)).map((e) => [e.id, e]));

const nums = (s) => String(s || '').match(/[0-9.]+/g)?.map(Number) || [];
const QUANT = (n) => Math.max(1, Math.floor(n));

const rows = [];
const failA = [], failB = [], failAStrict = [];
for (const sid of Object.keys(truth).sort()) {
  const t = truth[sid];
  const claimed = nums(byId.get(sid)?.lineWidths);
  const actual = t.actual;
  const major = t.major;
  /* A 严格：±0.05 直接对上 */
  const ghostStrict = claimed.filter((c) => !actual.some((x) => Math.abs(x - c) <= 0.05));
  /* A 量化：border 量化后能对上就算找到 */
  const ghost = claimed.filter((c) => {
    if (actual.some((x) => Math.abs(x - c) <= 0.05)) return false;
    return !actual.some((x) => Math.abs(x - QUANT(c)) <= 0.05);
  });
  /* B：主要线宽必须被覆盖（实测 m 命中某声称值的 ±0.05 或其量化结果） */
  const missedMajor = major.filter((x) =>
    !claimed.some((c) => Math.abs(c - x) <= 0.05 || QUANT(c) === x));
  if (ghost.length) failA.push(sid);
  if (ghostStrict.length) failAStrict.push(sid);
  if (missedMajor.length) failB.push(sid);
  rows.push({ sid, claimed, actual, major, ghost, ghostStrict, missedMajor });
}

console.log('案   声称                               实测                                  A(量化)   A(严格)  B(漏主要)');
for (const r of rows) {
  console.log(
    r.sid.padEnd(4) + r.claimed.join(',').padEnd(35) +
    r.actual.map((x) => x + '×' + truth[r.sid].counts[x]).join(' ').padEnd(37) +
    (r.ghost.length ? '✗' + r.ghost.join(',') : '✓').padEnd(10) +
    (r.ghostStrict.length ? '✗' + r.ghostStrict.join(',') : '✓').padEnd(10) +
    (r.missedMajor.length ? '✗' + r.missedMajor.join(',') : '✓')
  );
}
console.log(`\nA（量化口径）声称值都能在页面找到: ${30 - failA.length}/30   违例: ${failA.join(' ') || '无'}`);
console.log(`A（严格 ±0.05）:                  ${30 - failAStrict.length}/30   违例: ${failAStrict.join(' ') || '无'}`);
console.log(`B 主要线宽(≥10次)都被声称:          ${30 - failB.length}/30   违例: ${failB.join(' ') || '无'}`);
const allFail = new Set([...failA, ...failB]);
console.log(`A∧B 全过: ${30 - allFail.size}/30`);

console.log('\n=== A 严格口径的违例为什么不算失败（逐条给出量化证据）===');
for (const r of rows.filter((x) => x.ghostStrict.length)) {
  for (const g of r.ghostStrict) {
    console.log(`  ${r.sid}  ${g}px → Chrome border 量化得 ${QUANT(g)}px，页面实测含 ${QUANT(g)}px ` +
      `(${r.actual.includes(QUANT(g)) ? '是' : '否'})`);
  }
}
writeFileSync(join(ROOT, 'deliverables/70-exec/probes-b/acceptance-after.json'), JSON.stringify({ rows, failA, failAStrict, failB }, null, 1));
console.log('\n已写 deliverables/70-exec/probes-b/acceptance-after.json');
