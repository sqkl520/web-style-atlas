#!/usr/bin/env node
/* EXEC-B：改前/改后"原子约束条数"的同口径对比，并把差额**逐类归因**。
 *
 * 任务验收写的是"机械可验的约束条数不能减少"。只报一个总数不够：
 * 总数掉了，可能是真丢约束，也可能只是**抽取器的分段锚点**变了
 * （它靠 `l.startsWith('这一案最容易…')` / `match(/不要用 ([^。]+)。/)` 定位）。
 * 这两者的性质完全不同，必须分开。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const B = 'D:/Web/style/deliverables/70-exec/probes-b';
const before = JSON.parse(readFileSync(join(B, 'constraints.json'), 'utf8'));
const afterPath = process.argv[2] || join(B, 'constraints.json');

function tally(c) {
  const byKind = new Map();
  for (const [id, v] of Object.entries(c.per || {})) {
    for (const it of (v.items || [])) {
      const k = it.cat + '|' + it.sec + '|' + it.kind;
      byKind.set(k, (byKind.get(k) || 0) + 1);
    }
  }
  return byKind;
}

/* 注意：B-extract-constraints.mjs 每次跑都会覆盖同目录的 constraints.json，
 * 所以调用方必须先把改前的那份另存。这里只做对比。 */
const cur = JSON.parse(readFileSync(afterPath, 'utf8'));
const A = tally(before), Bn = tally(cur);
const keys = new Set([...A.keys(), ...Bn.keys()]);
const rows = [];
for (const k of keys) {
  const a = A.get(k) || 0, b = Bn.get(k) || 0;
  if (a !== b) rows.push({ k, before: a, after: b, delta: b - a });
}
rows.sort((x, y) => x.delta - y.delta);
console.log('=== 逐类差额（改后 − 改前）===');
console.log('  类别                                        改前  改后  差额');
for (const r of rows) {
  console.log('  ' + r.k.padEnd(44) + String(r.before).padStart(4) + String(r.after).padStart(6) + String(r.delta).padStart(6));
}
const totB = before.totals, totA = cur.totals;
console.log('\n=== 总数 ===');
console.log(`  M ${totB.M} → ${totA.M}  (${totA.M - totB.M >= 0 ? '+' : ''}${totA.M - totB.M})`);
console.log(`  S ${totB.S} → ${totA.S}  (${totA.S - totB.S >= 0 ? '+' : ''}${totA.S - totB.S})`);
console.log(`  J ${totB.J} → ${totA.J}  (${totA.J - totB.J >= 0 ? '+' : ''}${totA.J - totB.J})`);
console.log(`  总 ${totB.total} → ${totA.total}`);
