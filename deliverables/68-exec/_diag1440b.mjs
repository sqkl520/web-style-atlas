// Attribute the remaining 1440 delta precisely: .self-gate vs everything else.
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { serve } from './_srv.mjs';
const { server, url } = await serve('D:/Web/style', 8311);
const browser = await Browser.launch();
const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url + '/prototypes/_selection/index.html', { settleMs: 1300 });
await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
await sleep(600);

const M = () => {
  const H = innerHeight;
  const r = [...document.querySelectorAll('#ledger .row')].map((x) => { const b = x.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; });
  return {
    mastH: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1),
    foldH: +document.querySelector('.mast-fold').getBoundingClientRect().height.toFixed(1),
    claimH: +document.querySelector('.mast-claim').getBoundingClientRect().height.toFixed(1),
    exitH: +document.querySelector('.mast-exit').getBoundingClientRect().height.toFixed(1),
    sgH: document.querySelector('.self-gate') ? +document.querySelector('.self-gate').getBoundingClientRect().height.toFixed(1) : 0,
    firstTop: r[0].top, firstH: r[0].h, full: r.filter((x) => x.top >= -0.5 && x.bottom <= H + 0.5).length,
  };
};
console.log('A current          ', JSON.stringify(await page.eval(M)));
await page.eval(() => { const s = document.createElement('style'); s.id = '__a1'; s.textContent = '.self-gate{display:none!important}'; document.head.appendChild(s); });
await sleep(200);
console.log('B .self-gate hidden', JSON.stringify(await page.eval(M)));
await browser.close(); server.close();
