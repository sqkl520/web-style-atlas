/* 修正版：从 findings[] 里按 level=FAIL 统计，并核对这些 FAIL 是否与规格冲突。 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();

const rows = [];
for (const dir of cases) {
  const rp = join(P, dir, '.inspect', 'report.json');
  if (!existsSync(rp)) { rows.push({ id: dir.slice(0, 3), dir, fails: null }); continue; }
  const j = JSON.parse(readFileSync(rp, 'utf8'));
  const fails = (j.findings || []).filter((f) => f.level === 'FAIL');
  const warns = (j.findings || []).filter((f) => f.level === 'WARN');
  rows.push({ id: dir.slice(0, 3), dir, fails, warns, at: j.at });
}

console.log('═══ ① 真实 FAIL 分布（从 findings[] 读）═══\n');
let withFail = 0;
const ruleTally = new Map();
for (const r of rows) {
  if (!r.fails) { console.log(`  ${r.id}  报告缺失`); continue; }
  if (r.fails.length) {
    withFail++;
    const ids = [...new Set(r.fails.map((f) => f.id))];
    console.log(`  ${r.id}  ${ids.join(', ')}     ${r.fails[0].message.slice(0, 70)}`);
    for (const id of ids) ruleTally.set(id, (ruleTally.get(id) || 0) + 1);
  }
}
console.log(`\n  有 FAIL 的案: ${withFail}/30`);
console.log('  按规则:', [...ruleTally.entries()].map(([k, v]) => `${k}×${v}`).join(', ') || '（无）');

console.log('\n═══ ② 报告新鲜度（at 时间）═══');
const dates = rows.filter((r) => r.at).map((r) => r.at.slice(0, 10));
const tally = dates.reduce((a, d) => { a[d] = (a[d] || 0) + 1; return a; }, {});
console.log('  ', JSON.stringify(tally));

console.log('\n═══ ③ 警告最多的规则 ═══');
const wTally = new Map();
for (const r of rows) for (const w of r.warns || []) wTally.set(w.id, (wTally.get(w.id) || 0) + 1);
for (const [k, v] of [...wTally.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(22)} ${v}/30`);
