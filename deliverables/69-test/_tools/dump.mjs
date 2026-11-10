// 把 raw-measure.json 的关键字段打成可读摘要。用法: node dump.mjs S20
import { readFileSync } from 'node:fs';
const id = process.argv[2];
const r = JSON.parse(readFileSync(`D:/Web/style/deliverables/69-test/${id}/raw-measure.json`, 'utf8'));
for (const k of Object.keys(r.viewports)) {
  const v = r.viewports[k];
  const raw = v.raw;
  console.log(`=== ${k}  vp=${JSON.stringify(raw.viewport)}  docH=${raw.docH}  charset=${raw.utf8}`);
  console.log('  fontsReady:', raw.fontsReady, ' loadedFonts:', JSON.stringify(raw.loadedFonts));
  console.log('  colors:', JSON.stringify(raw.colorCount));
  console.log('  radii:', JSON.stringify(raw.radii));
  console.log('  shadows:', JSON.stringify(raw.shadows));
  console.log('  filters:', JSON.stringify(raw.filters));
  console.log('  bwSet:', JSON.stringify(raw.bwSet));
  console.log('  svgStrokes:', JSON.stringify(raw.svgStrokes));
  console.log('  patterns:', JSON.stringify(raw.patterns));
  console.log('  bgImages:', JSON.stringify(raw.bgImages));
  console.log('  fontWho:', JSON.stringify(v.fontWho));
  console.log('  h1:', JSON.stringify(raw.h1 && { family: raw.h1.family, size: raw.h1.size, w: raw.h1.w, h: raw.h1.h }));
  console.log('  body:', JSON.stringify(raw.body && { family: raw.body.family, bg: raw.body.bg }));
  console.log('  imgs(' + raw.imgs.length + '):');
  for (const i of raw.imgs) {
    console.log(`    ${i.src}  box=${i.w}x${i.h}  nat=${i.natW}x${i.natH}  attr=${i.attrW}x${i.attrH}  ok=${i.complete}`);
  }
  console.log('  fontStacks:');
  for (const f of raw.fontStacks) console.log(`    ${f.el}  ${f.size}  ${f.family}  [${f.numeric}]`);
  if (v.geo) {
    for (const sel of Object.keys(v.geo)) {
      const arr = v.geo[sel];
      console.log(`  geo ${sel} (${arr.length}):`);
      for (const g of arr.slice(0, 16)) {
        console.log(`    box=${g.w}x${g.h} @${g.x},${g.y}  cols=${g.cs.gridCols}  col=${g.cs.gridColumn}  clip=${g.cs.clip}  tf=${g.cs.transform}  pad=${g.cs.padding}`);
      }
    }
  }
  if (v.consoleErrors && v.consoleErrors.length) console.log('  consoleErrors:', JSON.stringify(v.consoleErrors));
}
