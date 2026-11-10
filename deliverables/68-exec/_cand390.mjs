// Focused sweep: 16px on .row-family + the cheapest way to keep the 390 gate slack.
import { writeFileSync } from 'node:fs';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { serve } from './_srv.mjs';

const OUT = 'deliverables/68-exec';
const { server, url } = await serve('D:/Web/style', 8311);

const FAM = '.row-family{font-size:var(--s-16);line-height:1.45}';
const V = {
  base: '',
  fam16: FAM,
  fam16_lh140: '.row-family{font-size:var(--s-16);line-height:1.40}',
  fam16_lh135: '.row-family{font-size:var(--s-16);line-height:1.35}',
  fam16_lh132: '.row-family{font-size:var(--s-16);line-height:1.32}',
  fam16_pad5: FAM + '@media(max-width:620px){.row{padding:5px 0}}',
  fam16_meta4: FAM + '@media(max-width:620px){.row-meta{margin-top:4px}}',
  fam16_pad5_meta4: FAM + '@media(max-width:620px){.row{padding:5px 0}.row-meta{margin-top:4px}}',
  fam16_mobile_lh135: FAM + '@media(max-width:620px){.row-family{line-height:1.32}}',
  fam16_all_lean: FAM + '@media(max-width:620px){.row-family{line-height:1.34}.row{padding:5px 0}.row-meta{margin-top:4px}}',
};

const browser = await Browser.launch();
const out = {};

for (const [name, css] of Object.entries(V)) {
  const page = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
  await page.setViewport({ width: 390, height: 844, mobile: true });
  await page.goto(url + '/prototypes/_selection/index.html', { settleMs: 1000 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(400);
  if (css) { await page.eval((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, css); await sleep(250); }
  const r = { css };
  r.sorts = await page.eval(() => {
    const o = {}; const sel = document.querySelector('#sort'); const H = innerHeight;
    for (const v of ['n', 'fr', 'thr', 'gate', 'built']) {
      sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true }));
      const rs = [...document.querySelectorAll('#ledger .row')].map((x) => { const b = x.getBoundingClientRect(); return { id: (x.querySelector('h3') || {}).textContent?.slice(0, 2), top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; });
      o[v] = { firstId: rs[0].id, top: rs[0].top, h: rs[0].h, full: rs.filter((x) => x.top >= -0.5 && x.bottom <= H + 0.5).length, minSlack: +Math.min(...rs.map((x) => H - x.bottom)).toFixed(1), maxH: Math.max(...rs.map((x) => x.h)) };
    }
    return o;
  });
  await sleep(120);
  r.layout = await page.eval(() => {
    const H = innerHeight;
    const rs = [...document.querySelectorAll('#ledger .row')].map((x) => { const b = x.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
    const fam = document.querySelector('.row-family');
    return { docH: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      firstTop: rs[0].top, firstH: rs[0].h, full: rs.filter((x) => x.top >= -0.5 && x.bottom <= H + 0.5).length,
      famH: fam ? +fam.getBoundingClientRect().height.toFixed(1) : null, mastH: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1) };
  });
  r.panel = await page.eval(() => {
    const sel = document.querySelector('#sort'); sel.value = 'n'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    const rows = [...document.querySelectorAll('#ledger .row')]; const o = [];
    for (const i of [0, 12, 25, 28]) { rows[i].click(); o.push(Math.round(document.querySelector('#detail').scrollHeight)); document.querySelector('#d-close').click(); }
    return o;
  });
  out[name] = r;
  await page.close();
  const g = r.sorts.gate;
  console.log(`${name.padEnd(20)} gate: top=${g.top} h=${g.h} full=${g.full} slack=${g.minSlack} | first=${r.layout.firstTop}/${r.layout.firstH} famH=${r.layout.famH} mastH=${r.layout.mastH} docH=${r.layout.docH} ovf=${r.layout.overflowX} | panel=${r.panel.join('/')}`);
}

await browser.close(); server.close();
writeFileSync(`${OUT}/cand390-68.json`, JSON.stringify(out, null, 1));
