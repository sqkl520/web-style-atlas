// Isolate each of the two concurrent regressions at 1440.
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { serve } from './_srv.mjs';
const { server, url } = await serve('D:/Web/style', 8311);
const browser = await Browser.launch();
const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url + '/prototypes/_selection/index.html', { settleMs: 1200 });
await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
await sleep(500);

const M = () => {
  const h1 = document.querySelector('h1');
  const idEl = document.querySelector('.mast-id');
  const facts = document.querySelector('.mast-facts');
  const H = innerHeight;
  const r = [...document.querySelectorAll('#ledger .row')].map((x) => { const b = x.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; });
  return {
    mastH: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1),
    idW: +idEl.getBoundingClientRect().width.toFixed(1),
    factsW: +facts.getBoundingClientRect().width.toFixed(1),
    h1W: +h1.getBoundingClientRect().width.toFixed(1), h1H: +h1.getBoundingClientRect().height.toFixed(1),
    h1Lines: Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)),
    firstTop: r[0].top, firstH: r[0].h, full: r.filter((x) => x.top >= -0.5 && x.bottom <= H + 0.5).length,
  };
};
const arms = {};
arms.current = await page.eval(M);

// arm 1: strip the <b> the other agent added inside the facts <dt>
await page.eval(() => { const b = document.querySelector('.mast-facts dt b'); if (b) b.style.display = 'none'; });
await sleep(200); arms.noBoldRange = await page.eval(M);

// arm 2: also hide .self-gate
await page.eval(() => { const s = document.createElement('style'); s.textContent = '.self-gate{display:none!important}'; document.head.appendChild(s); });
await sleep(200); arms.noBoldNoSelfGate = await page.eval(M);

// arm 3: restore <b>, keep self-gate hidden
await page.eval(() => { const b = document.querySelector('.mast-facts dt b'); if (b) b.style.display = ''; document.getElementById('__x')?.remove(); });
await page.eval(() => { const s = document.createElement('style'); s.id = '__x'; s.textContent = '.self-gate{display:none!important}'; document.head.appendChild(s); });
await sleep(200); arms.boldNoSelfGate = await page.eval(M);

for (const [k, v] of Object.entries(arms)) {
  console.log(`${k.padEnd(20)} mast=${String(v.mastH).padStart(6)} idW=${String(v.idW).padStart(6)} factsW=${String(v.factsW).padStart(6)} h1=${v.h1W}x${v.h1H} lines=${v.h1Lines} | firstTop=${String(v.firstTop).padStart(5)} h=${v.firstH} full=${v.full}`);
}
await browser.close(); server.close();
