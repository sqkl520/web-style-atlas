/* 检查 Q7 那批生成物（out-*.html）在**修复后的度量器**下得多少分。
 * 这与 09-compare-fix 那个 Agent 的工作不重叠：它改判据，我只量现状。 */
import { measure } from '../../74-q7/measure.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const Q7 = join(ROOT, 'deliverables/74-q7');
const src = readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(src, ctx);
const SCHEMES = ctx.window.SCHEMES;
const dirOf = (id) => SCHEMES.find((s) => s.id === id)?.dir;

const outs = ['S03', 'S06', 'S07', 'S14', 'S17', 'S19', 'S23', 'S24', 'S26'];
for (const id of outs) {
  const f = join(Q7, `out-${id}.html`);
  const proto = join(ROOT, 'prototypes', dirOf(id), 'index.html');
  if (!existsSync(f)) { console.log(`${id}: 无生成物`); continue; }
  try {
    const [w, g] = [await measure(proto), await measure(f)];
    const q = (o) => ({ tracks: o.gridTracks, sel: o.gridSel, cols: o.maxColCount,
      hr: o.headBodyRatio, bw: o.borderWidths.join('/'), imgs: `${o.imgCount}/${o.imgVisible}` });
    console.log(`${id}\n  want ${JSON.stringify(q(w))}\n  got  ${JSON.stringify(q(g))}`);
  } catch (e) { console.log(`${id}: ${e.message.slice(0, 70)}`); }
}
process.exit(0);
