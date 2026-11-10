import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PROTO = 'prototypes';
const dirs = readdirSync(PROTO, { withFileTypes: true })
  .filter(d => d.isDirectory() && /^S\d{2}-/.test(d.name)).map(d => d.name).sort();

const ruleStat = {}; // id -> { FAIL: n, WARN: n }
let totalFail = 0, totalWarn = 0;
const perCase = [];

for (const d of dirs) {
  const p = join(PROTO, d, '.inspect', 'report.json');
  if (!existsSync(p)) { perCase.push({ id: d.slice(0, 3), missing: true }); continue; }
  const j = JSON.parse(readFileSync(p, 'utf8'));
  const f = j.findings || [];
  const fails = f.filter(x => x.level === 'FAIL');
  const warns = f.filter(x => x.level === 'WARN');
  totalFail += fails.length; totalWarn += warns.length;
  perCase.push({ id: d.slice(0, 3), fail: fails.map(x => x.id), warn: warns.length });
  for (const x of f) {
    if (!ruleStat[x.id]) ruleStat[x.id] = { FAIL: 0, WARN: 0 };
    ruleStat[x.id][x.level] = (ruleStat[x.id][x.level] || 0) + 1;
  }
}

console.log('=== 全库 FAIL/WARN 总数 ===');
console.log(`FAIL 总数 ${totalFail}  WARN 总数 ${totalWarn}`);
console.log('\n=== 每条规则出现在几个案里（按 FAIL 数排序）===');
const rows = Object.entries(ruleStat).sort((a, b) => (b[1].FAIL - a[1].FAIL) || (b[1].WARN - a[1].WARN));
for (const [id, c] of rows) {
  console.log(`  ${id.padEnd(22)} FAIL=${String(c.FAIL).padStart(3)}  WARN=${String(c.WARN).padStart(3)}`);
}

console.log('\n=== hairline 是否在闸门里出现过 ===');
console.log('hairline:', JSON.stringify(ruleStat['hairline'] || '从未出现'));

console.log('\n=== 有 FAIL 的案 ===');
for (const c of perCase) {
  if (c.missing) { console.log(`  ${c.id} 缺 report.json`); continue; }
  if (c.fail.length) console.log(`  ${c.id}: ${c.fail.join(', ')}`);
}

console.log('\n=== 达标判定：FAIL=0 的案数 ===');
const clean = perCase.filter(c => !c.missing && c.fail.length === 0).length;
console.log(`  FAIL=0: ${clean} / ${dirs.length}`);
