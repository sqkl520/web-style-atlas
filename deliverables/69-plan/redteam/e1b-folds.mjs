// E1b: does 19.4 screens depend on fold state? Try 5 configurations at 390x844.
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8611/prototypes/_selection/';
const OUT = 'deliverables/69-plan/redteam/';

const b = await Browser.launch({ width: 390, height: 844 });
const out = {};

async function run(tag, setup) {
  const page = await b.newPage({ width: 390, height: 844, mobile: true });
  await page.setViewport({ width: 390, height: 844, dsf: 1, mobile: true });
  await page.goto(BASE, { settleMs: 1800 });
  if (setup) { await page.eval(setup); await new Promise((r) => setTimeout(r, 500)); }
  const r = await page.eval(() => {
    const de = document.documentElement;
    const vh = window.innerHeight;
    const rows = [...document.querySelectorAll('.ledger .row')];
    const first = rows[0] && rows[0].getBoundingClientRect();
    return {
      docH: de.scrollHeight, vh, screens: +(de.scrollHeight / vh).toFixed(2),
      mastH: (document.getElementById('mast-fold') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height,
      railH: (document.getElementById('rail-fold') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height,
      barH: (document.getElementById('bar-fold') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height,
      firstTop: first ? +first.top.toFixed(1) : null,
      firstBottom: first ? +first.bottom.toFixed(1) : null,
      slack: first ? +(vh - first.bottom).toFixed(2) : null,
      hiddenEmpty: document.getElementById('empty').hidden,
    };
  });
  await page.screenshot({ path: OUT + `shots/e-fold-${tag}.jpg`, format: 'jpeg', quality: 72 });
  await page.close();
  return r;
}

out.default = await run('default', null);
out.railFolded = await run('railFolded', () => { for (const id of ['rail-fold']) { const d = document.getElementById(id); if (d) d.open = false; } });
out.allFolded = await run('allFolded', () => { for (const id of ['mast-fold', 'rail-fold', 'bar-fold']) { const d = document.getElementById(id); if (d) d.open = false; } });
out.sceneMoreOpen = await run('sceneMoreOpen', () => {
  const btns = [...document.querySelectorAll('.rail button, .rail .scene-more button, #flt-scene button')];
  const more = btns.find((x) => /还有|近似|更多|展开/.test(x.textContent || ''));
  if (more) more.click();
});
out.searchRestaurant = await run('searchRestaurant', () => {
  const q = document.getElementById('q'); q.value = '餐厅';
  q.dispatchEvent(new Event('input', { bubbles: true }));
});

writeFileSync(OUT + 'e1b-folds.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();
