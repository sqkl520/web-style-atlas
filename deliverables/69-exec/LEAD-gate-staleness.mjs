// 核实：data.js 里的 gate 数据是否已过期（exec Agent 说 check-docs 绿是假的）
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const data = readFileSync('prototypes/_selection/data.js', 'utf8');
const m = data.match(/window\.SCHEMES\s*=\s*(\[[\s\S]*\]);?\s*$/);
if (!m) { console.log('data.js 解析失败'); process.exit(1); }
const arr = JSON.parse(m[1]);

console.log('=== data.js 里的 gate 状态 vs report.json 实际 ===\n');
let mismatch = 0;
const rows = [];
for (const r of arr) {
  const dirs = readdirSync('prototypes').filter(d => d.startsWith(r.id + '-'));
  if (!dirs.length) continue;
  const rp = `prototypes/${dirs[0]}/.inspect/report.json`;
  if (!existsSync(rp)) { console.log(`${r.id}: 无 report.json`); continue; }
  const j = JSON.parse(readFileSync(rp, 'utf8'));
  const f = (j.findings || []).filter(x => x.level === 'FAIL');
  const actualFail = f.length;
  const actualIds = [...new Set(f.map(x => x.id))];

  const dataFail = r.gate ? r.gate.fail : null;
  const dataIds = r.gate ? (r.gate.failIds || []) : [];
  const same = dataFail === actualFail && JSON.stringify(dataIds.slice().sort()) === JSON.stringify(actualIds.slice().sort());
  if (!same) {
    mismatch++;
    rows.push({ id: r.id, dataFail, actualFail, dataIds, actualIds });
    console.log(`  ✗ ${r.id}: data.js 记 FAIL=${dataFail} [${dataIds.join(',')}]  实际 FAIL=${actualFail} [${actualIds.join(',')}]`);
  }
}
console.log(`\n不一致: ${mismatch} / ${arr.length} 案`);

const dataClean = arr.filter(r => r.gate && r.gate.fail === 0).length;
console.log(`\ndata.js 里 FAIL=0 的案数: ${dataClean}`);
console.log(`（README 与 check-docs 校对的「26」就是这个数）`);

// 从 report.json 现算
let actualClean = 0;
for (const r of arr) {
  const dirs = readdirSync('prototypes').filter(d => d.startsWith(r.id + '-'));
  if (!dirs.length) continue;
  const rp = `prototypes/${dirs[0]}/.inspect/report.json`;
  if (!existsSync(rp)) continue;
  const j = JSON.parse(readFileSync(rp, 'utf8'));
  const f = (j.findings || []).filter(x => x.level === 'FAIL');
  if (f.length === 0) actualClean++;
}
console.log(`report.json 现算 FAIL=0 的案数: ${actualClean}`);
console.log(`\n→ ${dataClean !== actualClean ? '⚠️ 已过期，必须重跑 collect-schemes' : '✓ 一致'}`);
