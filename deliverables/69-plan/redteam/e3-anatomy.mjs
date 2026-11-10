// E3/E4: is the "1 full card on first screen" achievement fragile? Test what any compression costs.
// Also measure how much of the 13.7 screens is CONTENT vs chrome (header/rail/filters).
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
const OUT = 'deliverables/69-plan/redteam/';
const b = await Browser.launch({ width: 390, height: 844 });
const p = await b.newPage({ width: 390, height: 844, mobile: true });
await p.setViewport({ width: 390, height: 844, dsf: 1, mobile: true });
await p.goto('http://127.0.0.1:8611/prototypes/_selection/', { settleMs: 2000 });

const base = await p.eval(() => {
  const vh = window.innerHeight;
  const rows = [...document.querySelectorAll('.ledger .row')];
  const chrome = {};
  for (const id of ['mast-fold', 'rail-fold', 'bar-fold']) {
    const el = document.getElementById(id);
    chrome[id] = el ? +el.getBoundingClientRect().height.toFixed(1) : 0;
  }
  const ledger = document.getElementById('ledger');
  const lb = ledger.getBoundingClientRect();
  const first = rows[0].getBoundingClientRect();
  return {
    vh, docH: document.documentElement.scrollHeight, screens: +(document.documentElement.scrollHeight / vh).toFixed(2),
    chrome, chromeTotal: Object.values(chrome).reduce((a, c) => a + c, 0),
    ledgerTop: +lb.top.toFixed(1), ledgerH: +lb.height.toFixed(1),
    firstTop: +first.top.toFixed(1), firstBottom: +first.bottom.toFixed(1), firstH: +first.height.toFixed(1),
    slack: +(vh - first.bottom).toFixed(2),
    rowH: rows.map((r) => +r.getBoundingClientRect().height.toFixed(1)),
    sumRowH: +rows.reduce((a, r) => a + r.getBoundingClientRect().height, 0).toFixed(1),
    scrollbar: window.innerWidth,
  };
});

// what does 8 screens of scrolling cost a user: how many rows are off-screen at start
const depth = await p.eval(() => {
  const rows = [...document.querySelectorAll('.ledger .row')];
  const vh = window.innerHeight;
  const perScreen = [];
  let cur = null;
  for (const r of rows) {
    const top = r.getBoundingClientRect().top + window.scrollY;
    const idx = Math.floor(top / vh);
    perScreen[idx] = (perScreen[idx] || 0) + 1;
  }
  return { rowsPerScreen: perScreen, screensWithRows: perScreen.filter(Boolean).length };
});

// Does the row show enough identity to remember it at screen 8?
const identity = await p.eval(() => {
  const row = document.querySelector('.ledger .row');
  return row ? {
    text: row.textContent.replace(/\s+/g, ' ').trim().slice(0, 300),
    ariaLabel: row.getAttribute('aria-label'),
    hasNumber: /\bS\d{2}\b/.test(row.textContent),
    thumbVisible: !!row.querySelector('img, .shot'),
    thumW: row.querySelector('img') ? row.querySelector('img').getBoundingClientRect().width : 0,
  } : null;
});

writeFileSync(OUT + 'e3-anatomy.json', JSON.stringify({ base, depth, identity }, null, 1));
console.log(JSON.stringify({ base, depth, identity }, null, 1));
await p.close(); await b.close();
