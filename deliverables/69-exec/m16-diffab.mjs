// 定位 _ab/ 里 S07 desktop 那 1404px、S07 mobile 那 1184px 到底在哪。
import { readFileSync } from 'node:fs';
import { diffPngs } from './png.mjs';

for (const vp of ['desktop', 'mobile', 'tablet']) {
  const a = readFileSync(`D:/Web/style/deliverables/69-exec/_ab/S07-${vp}-before-masked.png`);
  const b = readFileSync(`D:/Web/style/deliverables/69-exec/_ab/S07-${vp}-after-masked.png`);
  const d = diffPngs(a, b);
  if (d.sizeMismatch) { console.log(`${vp}: 尺寸不同 ${d.a} vs ${d.b}`); continue; }
  if (!d.n) { console.log(`${vp}: ★0 像素差`); continue; }
  console.log(`\n${vp}: ${d.n}px / ${d.totalPx}  最大Δ${d.maxDelta}`);
  console.log(`  包围盒 x[${d.minX}..${d.maxX}] y[${d.minY}..${d.maxY}]`);
  console.log(`  差异最多的行: ${d.topRows.map(([y, c]) => y + ':' + c).join(' ')}`);
  for (const s of d.samples.slice(0, 8)) console.log(`    (${s.x},${s.y}) ${s.a.join(',')} → ${s.b.join(',')} Δ${s.d}`);
}
