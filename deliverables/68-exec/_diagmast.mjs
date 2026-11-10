// Diagnose what grew in .mast after the concurrent edit.
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { serve } from './_srv.mjs';
const { server, url } = await serve('D:/Web/style', 8311);
const browser = await Browser.launch();

for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
  const page = await browser.newPage({ width: w, height: h, dsf: 1, mobile: w < 600 });
  await page.setViewport({ width: w, height: h, mobile: w < 600 });
  await page.goto(url + '/prototypes/_selection/index.html', { settleMs: 1200 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(500);
  const info = await page.eval(() => {
    const mast = document.querySelector('.mast');
    const kids = [...mast.children].map((el) => {
      const b = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return { tag: el.tagName + '.' + (el.className || ''), top: +b.top.toFixed(1), h: +b.height.toFixed(1), display: cs.display, pos: cs.position };
    });
    const fold = document.getElementById('mast-fold');
    const sg = document.querySelector('.self-gate');
    const cs = sg ? getComputedStyle(sg) : null;
    return {
      mastH: +mast.getBoundingClientRect().height.toFixed(1),
      gridCols: getComputedStyle(mast).gridTemplateColumns,
      kids,
      foldOpen: fold ? fold.open : null,
      foldH: fold ? +fold.getBoundingClientRect().height.toFixed(1) : null,
      foldSumH: document.querySelector('.mast-fold-sum') ? +document.querySelector('.mast-fold-sum').getBoundingClientRect().height.toFixed(1) : null,
      selfGate: sg ? { h: +sg.getBoundingClientRect().height.toFixed(1), size: cs.fontSize, display: cs.display, text: sg.textContent.slice(0, 60) } : null,
      selfGateScript: !!document.querySelector('script[src="self-gate.js"]'),
      // does self-gate.js exist / did it 404?
      errs: window.__loadErrs || null,
    };
  });
  console.log(`\n===== ${w} =====`);
  console.log(JSON.stringify(info, null, 1));
  await page.close();
}
await browser.close(); server.close();
