// Same-page A/B matrix: toggle one <style> element per candidate, measure, revert.
// No reload between candidates => no font/scrollbar noise between arms.
import { writeFileSync } from 'node:fs';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { serve } from './_srv.mjs';

const OUT = 'deliverables/68-exec';
const { server, url } = await serve('D:/Web/style', 8311);
const ARMS = process.argv.slice(2);

const FAM16 = '.row-family{font-size:var(--s-16)}';
const C = {
  base: '',
  // family 16px, leading held at the inherited 1.5
  f16: FAM16,
  f16_lh145: '.row-family{font-size:var(--s-16);line-height:1.45}',
  f16_lh140: '.row-family{font-size:var(--s-16);line-height:1.40}',
  // + recover pixels at <=620
  f16_lh140_pad5: '.row-family{font-size:var(--s-16);line-height:1.40}@media(max-width:620px){.row{padding:5px 0}}',
  f16_lh140_meta4: '.row-family{font-size:var(--s-16);line-height:1.40}@media(max-width:620px){.row-meta{margin-top:4px}}',
  f16_lh140_pm: '.row-family{font-size:var(--s-16);line-height:1.40}@media(max-width:620px){.row{padding:5px 0}.row-meta{margin-top:4px}}',
  f16_lh140_pm_img152: '.row-family{font-size:var(--s-16);line-height:1.40}@media(max-width:620px){.row{padding:5px 0}.row-meta{margin-top:4px}.shots .shot:first-child{max-width:152px}}',
  f16_lh145_pm_img152: '.row-family{font-size:var(--s-16);line-height:1.45}@media(max-width:620px){.row{padding:5px 0}.row-meta{margin-top:4px}.shots .shot:first-child{max-width:152px}}',
  f16_lh145_pm_img148: '.row-family{font-size:var(--s-16);line-height:1.45}@media(max-width:620px){.row{padding:5px 0}.row-meta{margin-top:4px}.shots .shot:first-child{max-width:148px}}',
  f16_lh140_pm_img148: '.row-family{font-size:var(--s-16);line-height:1.40}@media(max-width:620px){.row{padding:5px 0}.row-meta{margin-top:4px}.shots .shot:first-child{max-width:148px}}',
  // finalists, probed at the extremes (S13 gate / S20)
  FINAL_lh145: '.row-family{font-size:var(--s-16);line-height:1.45}@media(max-width:620px){.row{padding:5px 0}.row-meta{margin-top:4px}.shots .shot:first-child{max-width:152px}}',
  FINAL_lh140: '.row-family{font-size:var(--s-16);line-height:1.40}@media(max-width:620px){.row{padding:5px 0}.row-meta{margin-top:4px}.shots .shot:first-child{max-width:152px}}',
};

const setArm = async (page, css) => {
  await page.eval((c) => {
    let s = document.getElementById('__arm');
    if (!s) { s = document.createElement('style'); s.id = '__arm'; document.head.appendChild(s); }
    s.textContent = c;
  }, css);
  await sleep(220);
};

const MEASURE = (arm) => {
  const H = innerHeight;
  const rows = () => [...document.querySelectorAll('#ledger .row')].map((x) => { const b = x.getBoundingClientRect(); return { id: (x.querySelector('h3') || {}).textContent?.slice(0, 2), top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; });
  const sel = document.querySelector('#sort');
  const sorts = {};
  for (const v of ['n', 'fr', 'thr', 'gate', 'built']) {
    sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true }));
    window.scrollTo({ top: 0, behavior: 'instant' });
    const rs = rows();
    sorts[v] = { firstId: rs[0].id, top: rs[0].top, h: rs[0].h, full: rs.filter((x) => x.top >= -0.5 && x.bottom <= H + 0.5).length, slack: +(H - rs[0].bottom).toFixed(1) };
  }
  sel.value = 'n'; sel.dispatchEvent(new Event('change', { bubbles: true }));
  window.scrollTo({ top: 0, behavior: 'instant' });
  const rs = rows();
  const fam = document.querySelector('.row-family');
  const panel = [];
  for (const i of [0, 12, 25, 28]) { document.querySelectorAll('#ledger .row')[i].click(); panel.push(Math.round(document.querySelector('#detail').scrollHeight)); document.querySelector('#d-close').click(); }
  window.scrollTo({ top: 0, behavior: 'instant' });
  // body.size, probe algorithm verbatim
  const round = (n) => Math.round(n * 10) / 10;
  const fam1 = (ff) => ff.split(',')[0].replace(/["']/g, '').trim();
  const texts = [];
  for (const el of [...document.body.querySelectorAll('*')].slice(0, 9000)) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName)) continue;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    let d = ''; for (const n of el.childNodes) if (n.nodeType === 3) d += n.nodeValue;
    d = d.replace(/\s+/g, ' ').trim(); if (!d || el.tagName === 'OPTION' || el.closest('svg')) continue;
    const size = parseFloat(cs.fontSize); if (!size || size < 6) continue;
    texts.push({ chars: d.length, fam: fam1(cs.fontFamily), size: round(size), w: r.width, inCode: !!el.closest('pre,code,kbd,samp,textarea'), inUI: !!el.closest('[data-ui]') });
  }
  const bt = texts.filter((t) => t.size >= 10 && t.size <= 24 && t.chars >= 60 && !t.inCode && !t.inUI);
  const by = new Map(); for (const t of bt) { const k = t.fam + '|' + Math.round(t.size); by.set(k, (by.get(k) || 0) + t.chars); }
  const top = [...by.entries()].sort((a, b) => b[1] - a[1])[0];
  const longest = bt.slice().sort((a, b) => b.chars - a.chars)[0];
  const under13 = texts.filter((t) => t.size < 13 && t.chars >= 12).length;
  const allSizes = new Map();
  for (const t of texts) allSizes.set(Math.round(t.size), (allSizes.get(Math.round(t.size)) || 0) + t.chars);
  const tot = [...allSizes.values()].reduce((a, b) => a + b, 0);
  return {
    arm,
    body: top ? { size: +top[0].split('|')[1], chars: top[1] } : null,
    measureChars: longest ? Math.round(longest.w / (longest.size * 0.5)) : null,
    under13,
    dominantShare: +(([...allSizes.entries()].sort((a, b) => b[1] - a[1])[0][1] / tot)).toFixed(3),
    dominantPx: [...allSizes.entries()].sort((a, b) => b[1] - a[1])[0][0],
    famH: fam ? +fam.getBoundingClientRect().height.toFixed(1) : null,
    docH: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    mastH: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1),
    h1: +parseFloat(getComputedStyle(document.querySelector('h1')).fontSize).toFixed(1),
    railH: +document.querySelector('.rail').getBoundingClientRect().height.toFixed(1),
    firstTop: rs[0].top, firstH: rs[0].h, full: rs.filter((x) => x.top >= -0.5 && x.bottom <= H + 0.5).length,
    sorts, panel,
  };
};

const browser = await Browser.launch();
const out = {};
for (const [vp, w, h] of [['1440', 1440, 900], ['768', 768, 1024], ['390', 390, 844]]) {
  const page = await browser.newPage({ width: w, height: h, dsf: 1, mobile: w < 600 });
  await page.setViewport({ width: w, height: h, mobile: w < 600 });
  await page.goto(url + '/prototypes/_selection/index.html', { settleMs: 1200 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(500);
  out[vp] = {};
  for (const [name, css] of Object.entries(C)) {
    if (ARMS.length && !ARMS.includes(name)) continue;
    await setArm(page, css);
    out[vp][name] = await page.eval(MEASURE, name);
    process.stdout.write('.');
  }
  await page.close();
}
await browser.close(); server.close();
writeFileSync(`${OUT}/matrix-68.json`, JSON.stringify(out, null, 1));

for (const vp of ['1440', '768', '390']) {
  console.log(`\n===== ${vp} =====`);
  console.log('arm                  body  meas  share  famH  firstTop/firstH  full  mastH  h1     docH    ovf  panel');
  for (const [name, r] of Object.entries(out[vp])) {
    console.log(`${name.padEnd(20)} ${String(r.body?.size).padStart(4)} ${String(r.measureChars).padStart(5)} ${String(r.dominantPx + 'px/' + (r.dominantShare * 100).toFixed(1) + '%').padStart(11)} ${String(r.famH).padStart(5)}  ${String(r.firstTop).padStart(8)}/${String(r.firstH).padEnd(6)} ${String(r.full).padStart(3)} ${String(r.mastH).padStart(6)} ${String(r.h1).padStart(5)} ${String(r.docH).padStart(6)} ${String(r.overflowX).padStart(4)}  ${r.panel.join('/')}`);
  }
  if (vp === '390') {
    console.log('\n  sort arms (firstId/top/h/slack/full):');
    for (const [name, r] of Object.entries(out[vp])) {
      console.log(`  ${name.padEnd(20)} ` + ['n', 'gate'].map((k) => `${k}:${r.sorts[k].firstId}/${r.sorts[k].top}/${r.sorts[k].h}/${r.sorts[k].slack}/${r.sorts[k].full}`).join('  ') + '   allFull=' + ['n', 'fr', 'thr', 'gate', 'built'].map((k) => r.sorts[k].full).join(''));
    }
  }
}
