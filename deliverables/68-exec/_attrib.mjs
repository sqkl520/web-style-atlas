// Attribution: what exactly does the concurrently-added .self-gate cost at 390?
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { serve } from './_srv.mjs';
const { server, url } = await serve('D:/Web/style', 8311);
const browser = await Browser.launch();

const ARM = '.row-family{font-size:var(--s-16);line-height:1.45}' +
  '@media(max-width:620px){.row{padding:5px 0}.row-meta{margin-top:4px}.shots .shot:first-child{max-width:152px}}';

for (const [w, h] of [[390, 844], [768, 1024], [1440, 900]]) {
  const page = await browser.newPage({ width: w, height: h, dsf: 1, mobile: w < 600 });
  await page.setViewport({ width: w, height: h, mobile: w < 600 });
  await page.goto(url + '/prototypes/_selection/index.html', { settleMs: 1200 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(500);

  const probe = () => {
    const H = innerHeight;
    const rs = () => [...document.querySelectorAll('#ledger .row')].map((x) => { const b = x.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; });
    const sel = document.querySelector('#sort'); const sorts = {};
    for (const v of ['n', 'gate']) {
      sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true }));
      window.scrollTo({ top: 0, behavior: 'instant' });
      const r = rs();
      sorts[v] = { top: r[0].top, h: r[0].h, full: r.filter((x) => x.top >= -0.5 && x.bottom <= H + 0.5).length, slack: +(H - r[0].bottom).toFixed(1) };
    }
    sel.value = 'n'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    window.scrollTo({ top: 0, behavior: 'instant' });
    const sg = document.querySelector('.self-gate');
    return {
      mastH: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1),
      selfGateH: sg ? +sg.getBoundingClientRect().height.toFixed(1) : 0,
      selfGateDisplay: sg ? getComputedStyle(sg).display : 'absent',
      sorts, firstTop: rs()[0].top,
    };
  };

  const withSG = await page.eval(probe);
  // hide .self-gate only to attribute its cost — this is a measurement arm, not a proposal
  await page.eval(() => { const s = document.createElement('style'); s.id = '__nogate'; s.textContent = '.self-gate{display:none!important}'; document.head.appendChild(s); });
  await sleep(200);
  const withoutSG = await page.eval(probe);
  // then stack my candidate fix on top
  await page.eval((c) => { const s = document.createElement('style'); s.id = '__arm'; s.textContent = c; document.head.appendChild(s); }, ARM);
  await sleep(250);
  const withFixNoSG = await page.eval(probe);

  console.log(`\n===== ${w} =====`);
  for (const [k, v] of [['current (with .self-gate)', withSG], ['.self-gate hidden', withoutSG], ['hidden + .row-family 16px', withFixNoSG]]) {
    console.log(`${k.padEnd(28)} mastH=${String(v.mastH).padStart(6)} selfGateH=${String(v.selfGateH).padStart(6)} firstTop=${String(v.firstTop).padStart(6)} | n: full=${v.sorts.n.full} slack=${String(v.sorts.n.slack).padStart(6)} h=${v.sorts.n.h} | gate: full=${v.sorts.gate.full} slack=${String(v.sorts.gate.slack).padStart(6)} h=${v.sorts.gate.h}`);
  }
  await page.close();
}
await browser.close(); server.close();
