// 修复前的完整基线（全部字段），用来证明修复只动了 ①②，其余度量逐字节不变。
import { measure } from '../../74-q7/measure.mjs';
import { writeFileSync } from 'node:fs';
const CASES = [
  ['S01', 'prototypes/S01-red-wedge-broadsheet/index.html'],
  ['S07', 'prototypes/S07-slate-ink-contents/index.html'],
  ['S17', 'prototypes/S17-revenue-stamp-stub/index.html'],
  ['S33', 'prototypes/S33-teal-mirror-ledger/index.html'],
  ['S09', 'prototypes/S09-batik-price-board/index.html'],
  ['S28', 'prototypes/S28-jazz-intaglio-wall/index.html'],
];
const out = {};
for (const [id, f] of CASES) out[id] = await measure(f);
writeFileSync(new URL('./_baseline.json', import.meta.url), JSON.stringify(out, null, 1));
for (const [id] of CASES) {
  const m = out[id];
  console.log(`${id}  tracks=${m.gridTracks} sel=${m.gridSel} ratio=${JSON.stringify(m.mainRatio)} col=${m.maxColCount} hex=${m.hexCount} bw=${JSON.stringify(m.borderWidths)} sw=${JSON.stringify(m.svgStrokeWidths)} img=${m.imgCount}/${m.imgVisible} hb=${m.headBodyRatio} h=${m.pageHeight}`);
}
