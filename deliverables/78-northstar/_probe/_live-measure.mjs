import { measure } from '../../74-q7/measure.mjs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
/* ⚠️ fileURLToPath 返回的是**文件**路径，退 N 级要按目录算。
 * 本文件在 deliverables/78-northstar/_probe/x.mjs，退 4 级才是仓库根。 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
console.log('ROOT =', ROOT);
const ids = process.argv.slice(2).filter((a) => /^S\d{2}$/.test(a));
const DIRS = {
  S01: 'S01-red-wedge-broadsheet',
  S17: 'S17-revenue-stamp-stub',
  S28: 'S28-jazz-intaglio-wall',
};
for (const id of (ids.length ? ids : ['S01', 'S17'])) {
  const d = DIRS[id] || id;
  const target = resolve(ROOT, 'prototypes', d, 'index.html');
  console.log('  target =', target);
  const r = await measure(target);
  console.log(id, JSON.stringify({
    gridTracks: r.gridTracks, gridSel: r.gridSel,
    mainRatio: r.mainRatio, maxColCount: r.maxColCount,
    borderWidths: r.borderWidths,
  }));
}
process.exit(0);
