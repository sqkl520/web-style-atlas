// Per-case worst-case audit at 390: every row, every sort order, for each finalist.
import { writeFileSync } from 'node:fs';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { serve } from './_srv.mjs';

const OUT = 'deliverables/68-exec';
const { server, url } = await serve('D:/Web/style', 8311);
const C = {
  base: '',
  f16_lh145_img152: '.row-family{font-size:var(--s-16);line-height:1.45}@media(max-width:620px){.row{padding:5px 0}.row-meta{margin-top:4px}.shots .shot:first-child{max-width:152px}}',
  f16_lh140_img152: '.row-family{font-size:var(--s-16);line-height:1.40}@media(max-width:620px){.row{padding:5px 0}.row-meta{margin-top:4px}.shots .shot:first-child{max-width:152px}}',
  f16_lh140_img148: '.row-family{font-size:var(--s-16);line-height:1.40}@media(max-width:620px){.row{padding:5px 0}.row-meta{margin-top:4px}.shots .shot:first-child{max-width:148px}}',
};

const browser = await Browser.launch();
const out = {};
const page = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
await page.setViewport({ width: 390, height: 844, mobile: true });
await page.goto(url + '/prototypes/_selection/index.html', { settleMs: 1200 });
await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
await sleep(500);

out.mastH = await page.eval(() => +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1));

for (const [name, css] of Object.entries(C)) {
  await page.eval((c) => { let s = document.getElementById('__a'); if (!s) { s = document.createElement('style'); s.id = '__a'; document.head.appendChild(s); } s.textContent = c; }, css);
  await sleep(250);
  out[name] = await page.eval(() => {
    const H = innerHeight; const sel = document.querySelector('#sort'); const per = {};
    for (const v of ['n', 'fr', 'thr', 'gate', 'built']) {
      sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true }));
      window.scrollTo({ top: 0, behavior: 'instant' });
      const rs = [...document.querySelectorAll('#ledger .row')].map((x) => { const b = x.getBoundingClientRect(); return { id: x.getAttribute('data-id').slice(0, 3), top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; });
      // first-screen fullness is set by the FIRST row only, but record the worst row height too
      per[v] = { firstId: rs[0].id, firstTop: rs[0].top, firstH: rs[0].h, slack: +(H - rs[0].bottom).toFixed(1), full: rs.filter((x) => x.top >= -0.5 && x.bottom <= H + 0.5).length,
        maxH: Math.max(...rs.map((x) => x.h)), maxHId: rs.slice().sort((a, b) => b.h - a.h)[0].id, totalH: +rs.reduce((a, x) => a + x.h, 0).toFixed(0) };
    }
    return per;
  });
  process.stdout.write('.');
}
await browser.close(); server.close();
writeFileSync(`${OUT}/percase-68.json`, JSON.stringify(out, null, 1));

console.log(`\nmastH=${out.mastH}\n`);
for (const name of Object.keys(C)) {
  const r = out[name];
  console.log(`${name.padEnd(18)} gate: first=${r.gate.firstId} slack=${r.gate.slack} h=${r.gate.firstH} full=${r.gate.full} | maxRowH=${r.gate.maxH} (${r.gate.maxHId}) | n.slack=${r.n.slack} | allFull=${['n', 'fr', 'thr', 'gate', 'built'].map((k) => r[k].full).join('')} | totalH=${r.gate.totalH}`);
}
