// 对账：修复前(_baseline.json) vs 修复后(_after.json)，除 ①②（gridTracks/gridSel/mainRatio/maxColCount/gridCandidates）外必须逐字段相同。
import { readFileSync } from 'node:fs';
const b = JSON.parse(readFileSync(new URL('./_baseline.json', import.meta.url), 'utf8'));
const a = JSON.parse(readFileSync(new URL('./_after.json', import.meta.url), 'utf8'));
const SKIP = new Set(['gridTracks', 'gridSel', 'mainRatio', 'maxColCount', 'gridCandidates']);
let diffs = 0;
for (const id of Object.keys(b)) {
  const keys = new Set([...Object.keys(b[id]), ...Object.keys(a[id] || {})]);
  for (const k of keys) {
    if (SKIP.has(k)) continue;
    const x = JSON.stringify(b[id][k]), y = JSON.stringify(a[id][k]);
    if (x !== y) { diffs++; console.log(`DIFF ${id}.${k}\n  前: ${x}\n  后: ${y}`); }
  }
}
console.log(diffs === 0 ? '其余字段全部逐字节相同 ✓' : `${diffs} 处差异`);
console.log('\n①② 变化：');
for (const id of Object.keys(b)) {
  console.log(`  ${id}: ${b[id].gridTracks} → ${a[id].gridTracks} 轨 | ${b[id].gridSel} → ${a[id].gridSel} | maxCol ${b[id].maxColCount} → ${a[id].maxColCount}`);
}
