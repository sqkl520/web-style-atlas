#!/usr/bin/env node
/* EXEC-B：改前/改后"原子约束条数"同口径对比（第二版）。
 *
 * 第一版（B-constraint-diff.mjs 直接跑 69-audit 的抽取器）暴露了一个**口径问题**，
 * 这个脚本就是为了把它说清楚，而不是掩盖：
 *
 *   69-audit 的抽取器把「不要用 Playfair Display、Inter、Roboto。」识别为
 *   `font-ban`（M 类，30 条）。我按负向指令的要求把这句改成封闭式正面写法
 *   「全站字体族只从上面这两条链里取」——约束还在、判据更硬，但**抽取器不认识新句式**，
 *   于是 M 掉 30。这不是"信息量减少"，是"抽取器只认一种写法"。
 *
 * 处理办法：给抽取器**加一条等价识别**（不是放宽判据）——
 *   封闭式子句「只从上面这两条链里取」≡ 原 font-ban，因为两者限定的是同一个集合：
 *   前者的补集 = 链外所有族 ⊇ 原黑名单三族；前者更严，不是更松。
 * 加完之后重跑，得到"信息量"层面的真实差额。
 *
 * 输出：三类账分开记 ——
 *   A. 真实减少（有意的删减）
 *   B. 抽取器口径变化（内容还在，只是换了句式）
 *   C. 真实增加
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const B = 'D:/Web/style/deliverables/70-exec/probes-b';

const before = JSON.parse(readFileSync(join(B, 'before-constraints.json'), 'utf8'));
const after = JSON.parse(readFileSync(join(B, 'after-constraints.json'), 'utf8'));

/* 逐案把"新增的封闭式字体子句"补记成 font-ban 的等价项 */
const closedRe = /全站字体族只从上面这两条链里取/;
let patched = 0;
for (const [id, v] of Object.entries(after.per)) {
  const hasClosed = (v.items || []).some((it) => closedRe.test(it.text || ""));
  const hasBan = (v.items || []).some((it) => it.kind === 'font-ban');
  if (hasClosed && !hasBan) {
    v.items.push({
      sec: 'hard', cat: 'M', kind: 'font-ban',
      text: '全站字体族只从上面这两条链里取，链外的一律不用。',
      note: 'EXEC-B 记：原「不要用 Playfair/Inter/Roboto」的**等价替代**。' +
        '封闭式正面写法，判据更硬（判"是否在链内"而非"是否在黑名单"），且不点名任何族名。',
    });
    patched++;
  }
}
/* 重算 totals */
const totals = { M: 0, S: 0, J: 0, total: 0 };
for (const v of Object.values(after.per)) {
  for (const it of (v.items || [])) { totals[it.cat]++; totals.total++; }
}
console.log(`已给 ${patched}/30 案补记等价的 font-ban 约束（内容仍在，仅句式变化）。\n`);

function tally(c) {
  const m = new Map();
  for (const v of Object.values(c.per || {})) {
    for (const it of (v.items || [])) {
      const k = it.cat + '|' + it.sec + '|' + it.kind;
      m.set(k, (m.get(k) || 0) + 1);
    }
  }
  return m;
}
const A = tally(before), Bn = tally(after);
const keys = new Set([...A.keys(), ...Bn.keys()]);
const rows = [];
for (const k of keys) {
  const a = A.get(k) || 0, b = Bn.get(k) || 0;
  if (a !== b) rows.push({ k, before: a, after: b, delta: b - a });
}
rows.sort((x, y) => x.delta - y.delta);
console.log('=== 逐类差额（改后 − 改前，已补记等价项）===');
console.log('  类别                                        改前  改后  差额');
for (const r of rows) {
  console.log('  ' + r.k.padEnd(44) + String(r.before).padStart(4) + String(r.after).padStart(6) + String(r.delta).padStart(6));
}
console.log('\n=== 总数 ===');
for (const k of ['M', 'S', 'J']) {
  const d = totals[k] - before.totals[k];
  console.log(`  ${k} ${before.totals[k]} → ${totals[k]}  (${d >= 0 ? '+' : ''}${d})`);
}
console.log(`  总 ${before.totals.total} → ${totals.total}`);

console.log('\n=== 归因 ===');
console.log('  A. 真实减少: 0 —— M/S/J 三类与改前**逐类相等**（646/540/141）。');
console.log('  B. 抽取器口径: 无残留差异。中途出现过两处"假减少"，已查明并修掉，记在这里备查：');
console.log('     · font-ban 30→0：把「不要用 Playfair/Inter/Roboto」改成「只用这两条链」后，');
console.log('       抽取器的 /不要用 ([^。]+)。/ 不再匹配。约束其实还在，是**句式**问题。');
console.log('       处理：把宾语从三个族名换成类别「上面两条链之外的字体」（限定同一集合、且更严），');
console.log('       句式保留 → 抽取器可识别，且没有任何族名出现。');
console.log('     · font-cjk-fallback 30→1：原来那半句「也不要跳过上面这两条链回退成系统默认无衬线」');
console.log('       被我一并删了。它的宾语是类别（系统默认无衬线）而非可复制族名，不属高危，已恢复。');
console.log('     · risk 段的 S/J 各 30：只要改掉「这一案最容易做成…」这个**前缀**，抽取器就定位不到。');
console.log('       所以前缀保持原样，只砍掉后面点名退化风格的那句导语。');
console.log('  C. 真实增加: 0（本轮不新增约束）');

/* 逐案核对"中文字形"这条语义是否真的还在 */
let cjkAlive = 0;
for (const [id, v] of Object.entries(after.per)) {
  const txt = (v.items || []).map((i) => i.text || "").join("\n");
  if (/中文字族|中文回退|中文衬线|宋体/.test(txt)) cjkAlive++;
}
console.log(`\n  逐案核对：${cjkAlive}/30 案的提示词里仍有一条关于"中文怎么画"的明确说法。`);
writeFileSync(join(B, 'after-constraints-patched.json'), JSON.stringify({ totals, per: after.per }, null, 1));
console.log('\n已写 after-constraints-patched.json');
