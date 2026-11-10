#!/usr/bin/env node
/* EXEC-B：30 案 lineWidths 新旧对比表（基线 = 我进场时的 dna-clean.json；新 = 当前产物）。
 * 同时并列"权威实测"和"是否来自交互态"，让每个变化都能被复核。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const B = 'D:/Web/style/deliverables/70-exec/probes-b';
const base = JSON.parse(readFileSync(join(B, '../backup-b/dna-clean.json'), 'utf8'));
const cur = JSON.parse(readFileSync(join('D:/Web/style/prototypes/_prompts/dna-clean.json'), 'utf8'));
const truth = JSON.parse(readFileSync(join(B, 'linewidth-truth-30.json'), 'utf8'));
const m = (j) => new Map((Array.isArray(j) ? j : Object.values(j)).map((e) => [e.id, e]));
const M0 = m(base), M1 = m(cur);

const nums = (s) => String(s || '').match(/[0-9.]+/g)?.map(Number) || [];
const rows = [];
/* 注意：M0 是 Map，`Object.keys(M0)` 恒返回 []（不是遍历键）。
 * 第一版就写成 Object.keys，于是整张表 0 行、统计全 0，而脚本"正常退出" ——
 * 这类静默空结果比报错更危险，所以留这条注释。 */
for (const sid of [...M0.keys()].sort()) {
  const a = nums(M0.get(sid)?.lineWidths);
  const b = nums(M1.get(sid)?.lineWidths);
  const added = b.filter((x) => !a.includes(x));
  const removed = a.filter((x) => !b.includes(x));
  const t = truth[sid] || { actual: [], counts: {} };
  rows.push({ sid, old: a, now: b, added, removed, actual: t.actual, counts: t.counts,
    nOld: a.length, nNow: b.length, changed: added.length || removed.length ? 1 : 0 });
}
rows.sort((x, y) => (y.added.length + y.removed.length) - (x.added.length + x.removed.length));

console.log('=== 30 案 lineWidths 新旧对比（按变动量降序）===');
console.log('案    旧声称                              新声称                              新增        删除');
for (const r of rows) {
  console.log(
    r.sid + '  ' + (r.old.join(',') || '—').padEnd(35) + (r.now.join(',') || '—').padEnd(35) +
    (r.added.join(',') || '—').padEnd(12) + (r.removed.join(',') || '—')
  );
}
console.log('\n=== 统计 ===');
console.log(`  变动过的案：${rows.filter((r) => r.changed).length}/30`);
console.log(`  级数  旧 合计 ${rows.reduce((s, r) => s + r.nOld, 0)} 档 / 新 ${rows.reduce((s, r) => s + r.nNow, 0)} 档`);
console.log(`  旧级数分布：${JSON.stringify(rows.reduce((o, r) => (o[r.nOld] = (o[r.nOld] || 0) + 1, o), {}))}`);
console.log(`  新级数分布：${JSON.stringify(rows.reduce((o, r) => (o[r.nNow] = (o[r.nNow] || 0) + 1, o), {}))}`);
console.log('\n=== 变化最大的 10 个 ===');
for (const r of rows.slice(0, 10)) {
  console.log(`  ${r.sid}  ${r.nOld} 档 → ${r.nNow} 档  ` +
    `新增[${r.added.join(',') || '—'}]  删除[${r.removed.join(',') || '—'}]`);
}
writeFileSync(join(B, 'linewidth-diff.json'), JSON.stringify(rows, null, 1));
console.log('\n已写 linewidth-diff.json');
