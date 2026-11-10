// Component-level diff of .mast at 1440: HEAD vs NOW.
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { serve } from './_srv.mjs';
const { server, url } = await serve('D:/Web/style', 8311);
const browser = await Browser.launch();

const M = () => {
  const g = (s) => { const el = document.querySelector(s); if (!el) return null; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { h: +b.height.toFixed(1), mb: cs.marginBottom, mt: cs.marginTop, fs: cs.fontSize, lh: cs.lineHeight, disp: cs.display, text: (el.textContent || '').trim().slice(0, 40) }; };
  return {
    mastH: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1),
    gridCols: getComputedStyle(document.querySelector('.mast')).gridTemplateColumns,
    label: g('.mast-label') || g('.mast-kicker'),
    h1: g('h1'),
    wizard: g('.mast-wizard'),
    fold: g('.mast-fold'),
    foldSum: g('.mast-fold-sum'),
    claim: g('.mast-claim'),
    exit: g('.mast-exit'),
    selfGate: g('.self-gate'),
    facts: g('.mast-facts'),
    factsDt: g('.mast-facts dt'),
  };
};
const settle = async (page) => { await page.eval(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {})))); await sleep(200); };

for (const [name, path] of [['HEAD', '/deliverables/68-exec/_head/index.html'], ['NOW ', '/prototypes/_selection/index.html']]) {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(url + path, { settleMs: 1300 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(600); await settle(page);
  console.log(`\n===== ${name} =====`);
  console.log(JSON.stringify(await page.eval(M), null, 1));
  await page.close();
}
await browser.close(); server.close();
