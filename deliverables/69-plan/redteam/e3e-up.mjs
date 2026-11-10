// E3d: the a11y direction. The README claims raising body text to 16px drops the first screen
// from 1 full card to 0. The list's metadata is mostly 13px. Test 13 -> 16 -> 18 -> 20 upward.
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
const OUT = 'deliverables/69-plan/redteam/';
const b = await Browser.launch({ width: 390, height: 844 });
const cases = [
  ['base', ''],
  ['meta16', '.ledger .row * { font-size: 16px !important; }'],
  ['meta18', '.ledger .row * { font-size: 18px !important; }'],
  ['meta20', '.ledger .row * { font-size: 20px !important; }'],
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
    return {
      screens: +(document.documentElement.scrollHeight / vh).toFixed(2),
      firstH: +first.height.toFixed(1), firstBottom: +first.bottom.toFixed(1),
      slack: +(vh - first.bottom).toFixed(2), fullCards: full.length,
    };
  });
  res[tag] = m;
  await p.screenshot({ path: OUT + `shots/e3d-${tag}.jpg`, format: 'jpeg', quality: 74 });
  await p.close();
}
writeFileSync(OUT + 'e3d-up.json', JSON.stringify(res, null, 1));
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(9), 'screens=' + String(v.screens).padEnd(6), 'firstH=' + String(v.firstH).padEnd(7), 'slack=' + String(v.slack).padEnd(9), 'full=' + v.fullCards);
await b.close();
