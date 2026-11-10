// Definitive A/B/C: HEAD baseline, current working tree, and current + my fix isolated.
// HEAD is rendered from a fixture dir so concurrent edits can't change the baseline mid-run.
import { writeFileSync } from 'node:fs';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { serve } from './_srv.mjs';

const OUT = 'deliverables/68-exec';
const { server, url } = await serve('D:/Web/style', 8311);
const browser = await Browser.launch();

const MYFIX = '.row-family{font-size:var(--s-16);line-height:1.45}' +
  '@media(max-width:620px){.row{padding:5px 0}.row-meta{margin-top:4px}.shots .shot:first-child{max-width:152px}}';
// the reverse of my fix, to remove it from the working tree in-page
const UNFIX = '.row-family{font-size:var(--s-13);line-height:1.5}' +
  '@media(max-width:620px){.row{padding:6px 0}.row-meta{margin-top:6px}.shots .shot:first-child{max-width:160px}}';

const M = () => {
  const H = innerHeight;
  const rr = [...document.querySelectorAll('#ledger .row')].map((x) => { const b = x.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; });
  const h1 = document.querySelector('h1');
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
  const allSz = new Map(); for (const t of texts) allSz.set(Math.round(t.size), (allSz.get(Math.round(t.size)) || 0) + t.chars);
  const tot = [...allSz.values()].reduce((a, b) => a + b, 0);
  const dom = [...allSz.entries()].sort((a, b) => b[1] - a[1])[0];
  const sorts = {}; const sel = document.querySelector('#sort');
  if (sel) for (const v of ['n', 'gate']) {
    sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true }));
    window.scrollTo({ top: 0, behavior: 'instant' });
    const r2 = [...document.querySelectorAll('#ledger .row')].map((x) => { const b = x.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; });
    sorts[v] = { top: r2[0].top, h: r2[0].h, full: r2.filter((x) => x.top >= -0.5 && x.bottom <= H + 0.5).length, slack: +(H - r2[0].bottom).toFixed(1) };
  }
  if (sel) { sel.value = 'n'; sel.dispatchEvent(new Event('change', { bubbles: true })); window.scrollTo({ top: 0, behavior: 'instant' }); }
  return {
    mastH: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1),
    h1: +parseFloat(getComputedStyle(h1).fontSize).toFixed(1),
    h1Lines: Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)),
    railH: +document.querySelector('.rail').getBoundingClientRect().height.toFixed(1),
    firstTop: rr[0]?.top, firstH: rr[0]?.h,
    full: rr.filter((x) => x.top >= -0.5 && x.bottom <= H + 0.5).length,
    overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    bodySize: top ? +top[0].split('|')[1] : null,
    dominant: `${dom[0]}px/${(dom[1] / tot * 100).toFixed(1)}%`,
    measure: longest ? Math.round(longest.w / (longest.size * 0.5)) : null,
    under13: texts.filter((t) => t.size < 13 && t.chars >= 12).length,
    sorts,
  };
};
const HAIR = () => {
  const out = []; const big = [];
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (r.width * r.height >= 60 * 30) big.push({ el, r, cs });
  }
  const formish = (el) => el.matches('input, textarea, select, table, thead, tbody, tr, td, th, hr') || !!el.closest('table, [data-ui]');
  const lab = (el) => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')).slice(0, 50);
  for (const { el, r, cs } of big) {
    const bt = parseFloat(cs.borderTopWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0;
    const bl = parseFloat(cs.borderLeftWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0;
    const thin = (w, st) => w > 0 && w <= 1.5 && st !== 'none';
    if (formish(el)) continue;
    if ((r.width >= 240 && (thin(bt, cs.borderTopStyle) || thin(bb, cs.borderBottomStyle))) || (r.height >= 240 && (thin(bl, cs.borderLeftStyle) || thin(br, cs.borderRightStyle)))) out.push(lab(el) + ' ' + Math.round(r.width) + 'px');
  }
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    const horiz = r.height > 0 && r.height <= 1.5 && r.width >= 160, vert = r.width > 0 && r.width <= 1.5 && r.height >= 160;
    if (!horiz && !vert) continue; if (formish(el) && (el.tagName !== 'HR' || el.closest('[data-ui]'))) continue;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.03) continue;
    if (parseFloat(cs.backgroundColor ? cs.backgroundColor.length : 0) && 0) {}
    const bg = cs.backgroundColor; const m = bg.match(/rgba?\(([^)]+)\)/);
    const alpha = m ? (m[1].split(',').length > 3 ? parseFloat(m[1].split(',')[3]) : 1) : 0;
    if (alpha > 0.02 || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0 || cs.backgroundImage !== 'none') out.push(lab(el) + ' rule');
  }
  return out;
};

const arms = {};
for (const [vp, w, h] of [['1440', 1440, 900], ['768', 768, 1024], ['390', 390, 844]]) {
  arms[vp] = {};
  // ---- A: HEAD
  {
    const page = await browser.newPage({ width: w, height: h, dsf: 1, mobile: w < 600 });
    await page.setViewport({ width: w, height: h, mobile: w < 600 });
    await page.goto(url + '/deliverables/68-exec/_head/index.html', { settleMs: 1300 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await sleep(600);
    arms[vp].HEAD = { ...await page.eval(M), hair: (await page.eval(HAIR)).length };
    await page.close();
  }
  // ---- B: current tree, and C: current tree with my fix swapped back out
  {
    const page = await browser.newPage({ width: w, height: h, dsf: 1, mobile: w < 600 });
    await page.setViewport({ width: w, height: h, mobile: w < 600 });
    await page.goto(url + '/prototypes/_selection/index.html', { settleMs: 1300 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await sleep(600);
    arms[vp].NOW = { ...await page.eval(M), hair: (await page.eval(HAIR)).length };
    await page.eval((c) => { const s = document.createElement('style'); s.id = '__unfix'; s.textContent = c; document.head.appendChild(s); }, UNFIX);
    await sleep(250);
    arms[vp].NOW_minus_myfix = { ...await page.eval(M), hair: (await page.eval(HAIR)).length };
    await page.close();
  }
}
await browser.close(); server.close();
writeFileSync(`${OUT}/abc-68.json`, JSON.stringify(arms, null, 1));

for (const vp of ['1440', '768', '390']) {
  console.log(`\n===== ${vp} =====`);
  console.log('arm              mast   h1(px/ln) rail  firstTop firstH  full  ovf body dom        measure under13 hair');
  for (const [k, r] of Object.entries(arms[vp])) {
    console.log(`${k.padEnd(16)} ${String(r.mastH).padStart(6)} ${String(r.h1 + '/' + r.h1Lines).padStart(8)} ${String(r.railH).padStart(5)} ${String(r.firstTop).padStart(8)} ${String(r.firstH).padStart(6)} ${String(r.full).padStart(5)} ${String(r.overflowX).padStart(4)} ${String(r.bodySize).padStart(4)} ${r.dominant.padEnd(11)} ${String(r.measure).padStart(7)} ${String(r.under13).padStart(7)} ${String(r.hair).padStart(4)}`);
  }
  if (arms[vp].NOW.sorts?.n) for (const [k, r] of Object.entries(arms[vp])) {
    console.log(`   ${k.padEnd(16)} n: top=${r.sorts.n.top} h=${r.sorts.n.h} full=${r.sorts.n.full} slack=${r.sorts.n.slack} | gate: top=${r.sorts.gate.top} h=${r.sorts.gate.h} full=${r.sorts.gate.full} slack=${r.sorts.gate.slack}`);
  }
}
