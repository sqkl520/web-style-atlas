// Shared helpers for the 69-audit mobile-length probes. Read-only.
import { Browser, findChrome } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
export { Browser, findChrome };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function openPage(browser, { width, height, mobile = false, dsf = 1 }) {
  const page = await browser.newPage({ width, height, dsf, mobile: false });
  // ⚠️ pitfall 1: launch()/newPage() sizes don't switch the viewport reliably; set it explicitly.
  await page.setViewport({ width, height, mobile, dsf });
  return page;
}

// ⚠️ pitfall 4: fonts.ready is not enough; layout keeps settling. Wait 1500ms after load.
export async function settle(page, ms = 1500) {
  await page.eval('document.fonts && document.fonts.ready ? document.fonts.ready.then(()=>1) : 1');
  await sleep(ms);
}

export const MEASURE = function () {
  const d = document.documentElement;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const y = window.scrollY;
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: +(r.top + y).toFixed(1), h: +r.height.toFixed(1), bottom: +(r.bottom + y).toFixed(1), w: +r.width.toFixed(1) };
  };
  const rows = Array.from(document.querySelectorAll('#ledger .row'));
  const cards = rows.map((el, i) => {
    const r = el.getBoundingClientRect();
    const top = r.top + y, bot = r.bottom + y;
    return {
      i, id: el.dataset.id, top: +top.toFixed(1), h: +r.height.toFixed(1), bottom: +bot.toFixed(1),
      full: top >= -0.5 && bot <= vh + 0.5,
      part: bot > 0 && top < vh,
    };
  });
  const fullInFirst = cards.filter((c) => c.full).length;
  const partInFirst = cards.filter((c) => c.part).length;
  const first = cards[0] || null;
  const last = cards[cards.length - 1] || null;
  const sh = d.scrollHeight;
  const lidx = document.querySelector('#ledger');
  const chrome = {
    mast: box(document.querySelector('header.mast')),
    rail: box(document.querySelector('aside.rail')),
    bar: box(document.querySelector('.bar')),
    tplStrip: (() => { const el = document.querySelector('#tpl-strip'); return el && !el.hidden ? box(el) : null; })(),
    ledger: box(lidx),
    main: box(document.querySelector('.main')),
    detail: (() => { const el = document.querySelector('#detail'); return el && !el.hidden ? box(el) : null; })(),
  };
  const ledgerSum = cards.reduce((a, c) => a + c.h, 0);
  return {
    vw, vh, dpr: window.devicePixelRatio,
    scrollHeight: sh, bodyScrollHeight: document.body.scrollHeight,
    screens: +(sh / vh).toFixed(3),
    innerScreens: +((sh - vh) / vh).toFixed(3),
    rows: cards.length,
    fullInFirst, partInFirst,
    firstId: first && first.id,
    firstTop: first && first.top,
    firstH: first && first.h,
    firstBottom: first && first.bottom,
    slack: first ? +(vh - first.bottom).toFixed(1) : null,
    lastBottom: last && last.bottom,
    ledgerSum: +ledgerSum.toFixed(1),
    ledgerScreens: +(ledgerSum / vh).toFixed(3),
    chrome,
    cards,
    overflowX: +(d.scrollWidth - vw).toFixed(1),
    families: document.querySelectorAll('.row-family').length,
    countText: (document.querySelector('#count') || {}).textContent,
    sort: (document.querySelector('#sort') || {}).value,
    folds: ['mast-fold', 'rail-fold', 'bar-fold'].map((id) => {
      const el = document.getElementById(id);
      return el ? { id, open: el.open, h: +el.getBoundingClientRect().height.toFixed(1) } : null;
    }),
  };
};

export async function measure(page) {
  await page.eval('window.scrollTo(0,0)');
  await sleep(120);
  return page.eval(MEASURE);
}

export async function setSort(page, value) {
  await page.eval(`(() => { const s = document.querySelector('#sort'); s.value = ${JSON.stringify(value)}; s.dispatchEvent(new Event('change', { bubbles: true })); return s.value; })()`);
  await sleep(700);
}

export async function setFold(page, id, open) {
  await page.eval(`(() => { const el = document.getElementById(${JSON.stringify(id)}); if (!el) return null; el.open = ${open ? 'true' : 'false'}; return el.open; })()`);
  await sleep(700);
}

export async function resetFolds(page) {
  await page.eval(`(() => { ['mast-fold','rail-fold','bar-fold'].forEach(id => { const el = document.getElementById(id); if (el) el.open = window.innerWidth <= 980 ? false : true; }); return window.innerWidth; })()`);
  await sleep(300);
}

export const SORTS = [
  ['n', '方案号'],
  ['fr', '结构类型'],
  ['thr', '认知门槛'],
  ['gate', '闸门'],
  ['built', '未建在前'],
];
