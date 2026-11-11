// 最终对账：6 个目标案 vs CSS 真值 + 35 案里所有「栏数变了」的案的 CSS 核对依据。
import { measure } from '../../74-q7/measure.mjs';
import { writeFileSync, readFileSync } from 'node:fs';

const CASES = [
  ['S01', 'prototypes/S01-red-wedge-broadsheet/index.html', 4],
  ['S07', 'prototypes/S07-slate-ink-contents/index.html', 3],
  ['S17', 'prototypes/S17-revenue-stamp-stub/index.html', 3],
  ['S33', 'prototypes/S33-teal-mirror-ledger/index.html', 3],
  ['S09', 'prototypes/S09-batik-price-board/index.html', 3],
  ['S28', 'prototypes/S28-jazz-intaglio-wall/index.html', 16],
];
const out = {};
for (const [id, f] of CASES) out[id] = await measure(f);
writeFileSync(new URL('./_after.json', import.meta.url), JSON.stringify(out, null, 1));

const b = JSON.parse(readFileSync(new URL('./_baseline.json', import.meta.url), 'utf8'));
const SKIP = new Set(['gridTracks', 'gridSel', 'mainRatio', 'maxColCount', 'gridCandidates', 'gridFrom']);
let n = 0;
for (const id of Object.keys(b)) {
  for (const k of new Set([...Object.keys(b[id]), ...Object.keys(out[id] || {})])) {
    if (SKIP.has(k)) continue;
    if (JSON.stringify(b[id][k]) !== JSON.stringify(out[id][k])) { n++; console.log(`DIFF ${id}.${k}`); }
  }
}
console.log(n === 0 ? '其余字段零回归 ✓' : `${n} 处差异`);
console.log('');
for (const [id, , want] of CASES) {
  const m = out[id];
  console.log(`${id}  真值 ${want}  实测 ${m.gridTracks}  ${m.gridTracks === want ? '对上' : '不对'}  gridFrom=${m.gridFrom}  sel=${m.gridSel}`);
}
