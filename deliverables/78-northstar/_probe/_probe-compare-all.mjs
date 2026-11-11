// 35 案的前后对照表（旧判据 vs 新判据），给报告用。
import { measure as oldMeasure } from './_old-measure.mjs';
import { measure as newMeasure } from '../../74-q7/measure.mjs';
import { readdirSync } from 'node:fs';

const ROOT = decodeURIComponent(new URL('../../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const dirs = readdirSync(`${ROOT}/prototypes`, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

console.log('案   旧轨 旧元素                      新轨 新元素');
for (const d of dirs) {
  const f = `prototypes/${d}/index.html`;
  const id = d.slice(0, 3);
  let o = { gridTracks: 'ERR', gridSel: '' }, n = { gridTracks: 'ERR', gridSel: '' };
  try { o = await oldMeasure(f); } catch (e) { o = { gridTracks: 'ERR', gridSel: e.message.slice(0, 20) }; }
  try { n = await newMeasure(f); } catch (e) { n = { gridTracks: 'ERR', gridSel: e.message.slice(0, 20) }; }
  const flag = o.gridTracks !== n.gridTracks ? '  ←' : '';
  console.log(`${id}  ${String(o.gridTracks).padStart(4)} ${String(o.gridSel).padEnd(26)} ${String(n.gridTracks).padStart(4)} ${n.gridSel}${flag}`);
}
