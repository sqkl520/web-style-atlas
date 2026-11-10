// P9c：直接发 CDP 截图（captureBeyondViewport=true），页面坐标 + 3x，看 clamp 末尾有没有省略号
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, ROOT } from './_lib.mjs';

const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900, dsf: 2 });
await p.goto(PAGE, { settleMs: 1800 });

for (const id of ['S10', 'S12', 'S18']) {
  const box = await p.eval((sid) => {
    const row = [...document.querySelectorAll('#ledger [data-id]')].find((r) => r.getAttribute('data-id') === sid);
    if (!row) return null;
    const fam = row.querySelector('.row-family');
    const r = fam.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) };
  }, id);
  if (!box) continue;
  const { data } = await p.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: box.x, y: box.y, width: box.w, height: box.h + 6, scale: 3 },
  });
  const buf = Buffer.from(data, 'base64');
  writeFileSync(join(HERE, `clamp3x-${id}.png`), buf);
  console.log(`${id}: ${box.w}x${box.h} → ${buf.length} bytes`);
}
await b.close();
