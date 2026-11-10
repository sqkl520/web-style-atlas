// P9b：修正坐标（clip 用页面坐标，不是视口坐标）—— 截 .row-family 看有没有省略号
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join } from 'node:path';
import { HERE, ROOT } from './_lib.mjs';

const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900, dsf: 3 });
await p.goto(PAGE, { settleMs: 1800 });

for (const id of ['S10', 'S12', 'S18']) {
  const box = await p.eval((sid) => {
    const row = [...document.querySelectorAll('#ledger [data-id]')].find((r) => r.getAttribute('data-id') === sid);
    if (!row) return null;
    const fam = row.querySelector('.row-family');
    const r = fam.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top + window.scrollY), w: Math.round(r.width), h: Math.round(r.height), sy: Math.round(window.scrollY) };
  }, id);
  if (!box) { console.log(id + ' 未找到'); continue; }
  // clip 是页面坐标；内容超出视口时用 captureBeyondViewport
  await p.screenshot({ path: join(HERE, `clamp3x-${id}.png`), format: 'png', clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 1 } });
  console.log(`%s 页面坐标 x=%d y=%d w=%d h=%d（scrollY=%d）`, id, box.x, box.y, box.w, box.h, box.sy);
}
await b.close();
