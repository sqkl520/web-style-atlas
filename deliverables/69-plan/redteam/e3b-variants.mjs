// E3: is "first screen holds 1 full card" actually in tension with the body-size complaint?
// Direct test: bump the body font 13px -> 16px (what the a11y/body-size rule wants) and
// re-measure firstRowSlack. If slack is only 52px, this should push the card out of the fold.
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
const OUT = 'deliverables/69-plan/redteam/';
const b = await Browser.launch({ width: 390, height: 844 });
const out = {};

async function variant(tag, css) {
  const p = await b.newPage({ width: 390, height: 844, mobile: true });
  await p.setViewport({ width: 390, height: 844, dsf: 1, mobile: true });
  await p.goto('http://127.0.0.1:8611/prototypes/_selection/', { settleMs: 1800 });
  if (css) {
    await p.eval((c) => {
      const s = document.createElement('style');
      s.id = '__rt';
      s.textContent = c;
      document.head.appendChild(s);
    }, css);
    await new Promise((r) => setTimeout(r, 400));
  }
  const m = await p.eval(() => {
    const vh = window.innerHeight;
    const rows = [...document.querySelectorAll('.ledger .row')];
    const full = rows.filter((el) => { const b2 = el.getBoundingClientRect(); return b2.top >= 0 && b2.bottom <= vh + 0.5; });
    const first = rows[0].getBoundingClientRect();
    return {
      docH: document.documentElement.scrollHeight, screens: +(document.documentElement.scrollHeight / vh).toFixed(2),
      firstH: +first.height.toFixed(1), firstBottom: +first.bottom.toFixed(1),
      slack: +(vh - first.bottom).toFixed(2), fullCards: full.length,
      bodySize: getComputedStyle(document.body).fontSize,
      rowMeta: getComputedStyle(document.querySelector('.row .meta') || document.body).fontSize,
    };
  });
  await p.screenshot({ path: OUT + `shots/e3-${tag}.jpg`, format: 'jpeg', quality: 74 });
  await p.close();
  return m;
}

out.base = await variant('base', null);
// the documented trade-off: raise the body text that the list is mostly made of
out.body16 = await variant('body16', '.ledger .row { font-size: 16px !important; }');
// flush-fill variant: could we compress rows at all without breaking the fold?
out.tight = await variant('tight', '.ledger .row { padding-top:4px !important; padding-bottom:4px !important; }');
writeFileSync(OUT + 'e3b-variants.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();
