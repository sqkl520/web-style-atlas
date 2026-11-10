// E3c: find the exact compression budget. Shrink the meta/desc text (the 13px parts) and card
// padding progressively; record when firstRowSlack crosses 0 (i.e. the full card is lost).
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
const OUT = 'deliverables/69-plan/redteam/';
const b = await Browser.launch({ width: 390, height: 844 });

const cases = [
  ['base', ''],
  ['meta13', '.ledger .row * { font-size: 13px !important; }'],
  ['meta12', '.ledger .row * { font-size: 12px !important; }'],
  ['meta11', '.ledger .row * { font-size: 11px !important; }'],
  ['clamp-def', '.ledger .row .def { -webkit-line-clamp: 2 !important; display:-webkit-box !important; -webkit-box-orient:vertical; overflow:hidden; }'],
  ['hide-thumb', '.ledger .row img, .ledger .row .shot { display:none !important; }'],
  ['pad0', '.ledger .row { padding: 0 !important; }'],
];
const res = {};
for (const [tag, css] of cases) {
  const p = await b.newPage({ width: 390, height: 844, mobile: true });
  await p.setViewport({ width: 390, height: 844, dsf: 1, mobile: true });
  await p.goto('http://127.0.0.1:8611/prototypes/_selection/', { settleMs: 1700 });
  if (css) { await p.eval((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, css); await new Promise((r) => setTimeout(r, 350)); }
  const m = await p.eval(() => {
    const vh = window.innerHeight;
    const rows = [...document.querySelectorAll('.ledger .row')];
    const full = rows.filter((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= vh + 0.5; });
    const first = rows[0].getBoundingClientRect();
    const sizes = {};
    for (const el of rows[0].querySelectorAll('*')) {
      const t = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
      if (t) sizes[getComputedStyle(el).fontSize] = (sizes[getComputedStyle(el).fontSize] || 0) + t.length;
    }
    return {
      screens: +(document.documentElement.scrollHeight / vh).toFixed(2),
      firstH: +first.height.toFixed(1), firstBottom: +first.bottom.toFixed(1),
      slack: +(vh - first.bottom).toFixed(2), fullCards: full.length,
      fontSizeMix: sizes,
    };
  });
  res[tag] = m;
  await p.close();
}
writeFileSync(OUT + 'e3c-budget.json', JSON.stringify(res, null, 1));
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(12), 'screens=' + String(v.screens).padEnd(6), 'firstH=' + String(v.firstH).padEnd(7), 'slack=' + String(v.slack).padEnd(8), 'full=' + v.fullCards);
console.log('\nbase fontSize mix of first card:', JSON.stringify(res.base.fontSizeMix));
await b.close();
