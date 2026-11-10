#!/usr/bin/env node
/* EXEC-B：把每个「声称了但实测没有」的值归因到具体原因。
 *
 * 这一步是整个修法的判据来源。四个互斥原因：
 *   Q  border 量化 —— 作者写 1.25px 的 border，Chrome 在 dpr=1 把 border-width
 *      量化成整数（实测 30 档里 20 档被改，见 border-quantization.json）。
 *      这类"假声称"是**测量假象**，不是抽取错误，值该保留。
 *   S  交互态     —— 只在 :hover/:focus-visible/:active/[aria-pressed] 里出现，
 *      静态首屏看不见。不属于"线宽分级"这一层。
 *   M  媒体不匹配 —— 只在 1440 不成立的 @media 里。属于窄屏/降级态。
 *   X  真的没用   —— 源码里有、任何视口都不出现。这才是真正的抽取错误。
 *
 * 判定顺序：Q 先判（因为它会伪装有），再 S、M，最后 X。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const truth = JSON.parse(readFileSync(join(ROOT, 'deliverables/70-exec/probes-b/linewidth-truth-30.json'), 'utf8'));
const ctxRows = JSON.parse(readFileSync(join(ROOT, 'deliverables/70-exec/probes-b/linewidth-context.json'), 'utf8'));
const ctx = new Map(ctxRows.map((r) => [r.sid, r]));
const dna = JSON.parse(readFileSync(join(ROOT, 'prototypes/_prompts/dna-clean.json'), 'utf8'));
const byId = new Map((Array.isArray(dna) ? dna : Object.values(dna)).map((e) => [e.id, e]));

const nums = (s) => String(s || '').match(/[0-9.]+/g)?.map(Number) || [];
/* Chrome 在 dpr=1 下把 **border/outline** 的宽度量化成 `max(1, floor(w))`，实测 30 档
 * 逐个验证（见 border-quantization.json）：
 *   0.2/0.35/0.4/0.5/0.6/0.8/1.1/1.2/1.25/1.4/1.5/1.6/1.7 → 1px   （最小 1px）
 *   2.4/2.5 → 2    3.2/3.5/3.6 → 3    5.5 → 5    14.5 → 14
 * 注意**不是 round()**：round(1.5)=2 但实测是 1，round(3.5)=4 但实测是 3。
 * 唯一吻合的是 floor + 下限 1px。
 * **stroke-width 完全不被量化**（同一批 30 档实测 0 档被改）—— 所以 Q 只对 border/outline 成立。
 * ⇒ 一条 `border:1.25px` 的声称值，页面上永远只能量到 1px：这不是抽取错误，是渲染量化。
 *   但一条 `stroke-width:0.2` 若页面量不到，那就是真的没画（不在 Q 里）。 */
const QUANT = (n) => Math.max(1, Math.floor(n));
const BORDERISH = /^(?:border|outline|column-rule)/i;

const report = [];
for (const sid of Object.keys(truth).sort()) {
  const t = truth[sid];
  const c = ctx.get(sid);
  const claimed = nums(byId.get(sid)?.lineWidths);
  const ghosts = claimed.filter((x) => !t.actual.some((a) => Math.abs(a - x) <= 0.05));
  const reasons = {};
  for (const g of ghosts) {
    const q = QUANT(g);
    let why = 'X';
    if (t.actual.some((a) => Math.abs(a - q) <= 0.05) && Math.abs(q - g) > 1e-9) why = 'Q';
    else if (c && c.stateVals.includes(g)) why = 'S';
    else if (c && c.mediaVals.includes(g)) why = 'M';
    reasons[g] = why;
  }
  const missedMajor = t.major.filter((x) => !claimed.some((a) => Math.abs(a - x) <= 0.05));
  report.push({ sid, claimed, actual: t.actual, ghosts, reasons, missedMajor });
}

const tally = { Q: 0, S: 0, M: 0, X: 0 };
for (const r of report) for (const g of r.ghosts) tally[r.reasons[g]]++;
console.log('案   假声称值          归因                                   漏讲主要线宽');
for (const r of report) {
  if (!r.ghosts.length && !r.missedMajor.length) continue;
  const gs = r.ghosts.map((g) => `${g}(${r.reasons[g]})`).join(' ');
  console.log(r.sid.padEnd(4) + gs.padEnd(50) + (r.missedMajor.join(',') || '—'));
}
console.log('\n=== 「声称了但实测没有」的归因汇总 ===');
console.log(`  Q  border 量化造成（测量假象，值应保留）: ${tally.Q} 个`);
console.log(`  S  只在交互态出现（不属于分级）:          ${tally.S} 个`);
console.log(`  M  只在 1440 不成立的 @media 里:          ${tally.M} 个`);
console.log(`  X  源码有但任何视口都不用（真错误）:      ${tally.X} 个`);
console.log(`  合计 ${tally.Q + tally.S + tally.M + tally.X} 个跨 ${new Set(report.filter((r) => r.ghosts.length).map((r) => r.sid)).size} 案`);

console.log('\n=== 每案归因明细 ===');
for (const r of report.filter((x) => x.ghosts.length)) {
  console.log(`  ${r.sid}  声称[${r.claimed.join(',')}]  实测[${r.actual.join(',')}]`);
  for (const g of r.ghosts) {
    const label = { Q: 'border 量化 → 实测 ' + QUANT(g) + 'px', S: '只在 :hover/:focus 等交互态', M: '只在 1440 不成立的 @media', X: '源码有、页面真的没用' }[r.reasons[g]];
    console.log(`       ${g}px  ${r.reasons[g]}  ${label}`);
  }
}
writeFileSync(join(ROOT, 'deliverables/70-exec/probes-b/ghost-attribution.json'), JSON.stringify({ report, tally }, null, 1));
console.log('\n已写 deliverables/70-exec/probes-b/ghost-attribution.json');
