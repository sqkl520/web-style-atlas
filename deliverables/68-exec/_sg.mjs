// Settled measurement (waits out the .row 'rise' animation) + isolate .self-gate at 1440.
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { serve } from './_srv.mjs';
const { server, url } = await serve('D:/Web/style', 8311);
const browser = await Browser.launch();

const M = () => {
  const H = innerHeight;
  const rr = [...document.querySelectorAll('#ledger .row')].map((x) => { const b = x.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; });
  return {
    anims: document.getAnimations().filter((a) => a.playState === 'running').length,
    mastH: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1),
    foldH: +document.querySelector('.mast-fold').getBoundingClientRect().height.toFixed(1),
    sgH: document.querySelector('.self-gate') ? +document.querySelector('.self-gate').getBoundingClientRect().height.toFixed(1) : 0,
    sgInFold: !!document.querySelector('.mast-fold .self-gate'),
    firstTop: rr[0].top, firstH: rr[0].h,
    full: rr.filter((x) => x.top >= -0.5 && x.bottom <= H + 0.5).length,
  };
};
const settle = async (page) => { await page.eval(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {})))); await sleep(150); };

for (const [w, h] of [[1440, 900]]) {
  const page = await browser.newPage({ width: w, height: h, dsf: 1 });
  await page.setViewport({ width: w, height: h });
  await page.goto(url + '/prototypes/_selection/index.html', { settleMs: 1300 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(600); await settle(page);
  console.log('A current          ', JSON.stringify(await page.eval(M)));
  await page.eval(() => { const s = document.createElement('style'); s.textContent = '.self-gate{display:none!important}'; document.head.appendChild(s); });
  await sleep(300); await settle(page);
  console.log('B .self-gate hidden', JSON.stringify(await page.eval(M)));
  await page.close();
}
await browser.close(); server.close();
