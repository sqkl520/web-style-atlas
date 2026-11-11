/* 对比：同样 13 个「probe 选错」的案，measure.mjs 选的是什么。
 * 如果 measure 选对了，说明它的判据可以搬到 probe。 */
import { measure } from '../../74-q7/measure.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const c = { window: {} };
vm.createContext(c);
vm.runInContext(readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8'), c);
const SCHEMES = c.window.SCHEMES;
const dirOf = (id) => SCHEMES.find((s) => s.id === id)?.dir;

const BAD = /^(footer|header|nav|aside)\b|\b(foot|footer|masthead|colophon|nav|topbar|menu|sidebar|breadcrumb)/i;
const badIds = [];
for (const d of readdirSync(join(ROOT, 'prototypes')).filter((x) => /^S\d\d-/.test(x)).sort()) {
  try {
    const s = JSON.parse(readFileSync(join(ROOT, 'prototypes', d, '.inspect/report.json'), 'utf8'))
      .viewports[0].metrics.structure;
    if (s && BAD.test(s.columnsFrom || '')) badIds.push({ id: d.slice(0, 3), probe: s.columnsFrom, probeCols: s.columns });
  } catch { /* 忽略 */ }
}

console.log('probe 选错的案，用 measure 重量一遍：\n');
console.log('案   probe 选中（错）              栏  measure 选中            栏');
for (const b of badIds) {
  let m = { gridSel: 'ERR', gridTracks: '?' };
  try { m = await measure(join(ROOT, 'prototypes', dirOf(b.id), 'index.html')); } catch { /* 忽略 */ }
  const fixed = !BAD.test(m.gridSel || '');
  console.log(`${b.id}  ${String(b.probe).padEnd(28)}${String(b.probeCols).padEnd(3)} ${String(m.gridSel).padEnd(22)}${String(m.gridTracks).padEnd(3)} ${fixed ? '✓ 修正' : '✗ 也错'}`);
}
process.exit(0);
