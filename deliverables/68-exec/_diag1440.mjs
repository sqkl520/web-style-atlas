// What is the remaining +83.7px in .mast at 1440 vs the 407 baseline?
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
  const mast = document.querySelector('.mast');
  const kids = [...mast.querySelectorAll('.mast-id > *, .mast > *')].map((el) => {
    const b = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return `${el.tagName.toLowerCase()}.${(el.className || '').toString().trim().split(/\s+/)[0]} h=${b.height.toFixed(1)} disp=${cs.display}`;
  });
  const h1 = document.querySelector('h1');
  return {
    mastH: +mast.getBoundingClientRect().height.toFixed(1),
    cols: getComputedStyle(mast).gridTemplateColumns,
    idW: +document.querySelector('.mast-id').getBoundingClientRect().width.toFixed(1),
    factsW: +document.querySelector('.mast-facts').getBoundingClientRect().width.toFixed(1),
    h1: `${h1.getBoundingClientRect().width.toFixed(1)}x${h1.getBoundingClientRect().height.toFixed(1)} lines=${Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight))}`,
    claim: (() => { const c = document.querySelector('.mast-claim'); return c ? `${c.getBoundingClientRect().width.toFixed(1)}x${c.getBoundingClientRect().height.toFixed(1)}` : null; })(),
    exit: (() => { const c = document.querySelector('.mast-exit'); return c ? `${c.getBoundingClientRect().width.toFixed(1)}x${c.getBoundingClientRect().height.toFixed(1)}` : null; })(),
    fold: (() => { const c = document.querySelector('.mast-fold'); return c ? `${c.getBoundingClientRect().height.toFixed(1)} open=${c.open}` : null; })(),
    kids,
  };
};
console.log('CURRENT:', JSON.stringify(await page.eval(M), null, 1));

// does mast-facts still carry a width-pushing label?
console.log('\nfacts dt text:', await page.eval(() => [...document.querySelectorAll('.mast-facts dt')].map((d) => d.textContent.trim())));
await browser.close(); server.close();
