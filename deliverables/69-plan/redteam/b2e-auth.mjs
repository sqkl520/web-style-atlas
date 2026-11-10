// B2e: authoritative check. For each zero-hit term, does the TEMPLATE BLOCK give a
// NAMED recommendation (a .tpl-cards <li> whose full text contains the term), or the
// generic "模板层也给不了你" fallback? Also measure whether the whole empty state fits
// in the first screen at 390 and 1440.
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
const BASE = 'http://127.0.0.1:8611/prototypes/_selection/';
const OUT = 'deliverables/69-plan/redteam/';
const b = await Browser.launch({ width: 1440, height: 900 });
const page = await b.newPage({ width: 1440, height: 900 });
await page.goto(BASE, { settleMs: 1800 });

const res = await page.eval(() => {
  const q = document.getElementById('q');
  const P = window.STYLE_PROMPTS;
  const eTpl = document.getElementById('empty-tpl');
  const empty = document.getElementById('empty');
  const terms = Object.keys(P.sceneIndex).concat(P.unsupported);
  const out = [];
  for (const t of terms) {
    q.value = t; q.dispatchEvent(new Event('input', { bubbles: true }));
    if (document.getElementById('ledger').querySelectorAll('.row').length) continue;
    // cards = the recommended block only; the always-present full list is .tpl-all
    const cards = [...eTpl.querySelectorAll('.tpl-cards > li')]
      .map((li) => li.textContent.replace(/\s+/g, ' ').trim());
    const head = (eTpl.querySelector('.tpl-empty-head') || {}).textContent || '';
    out.push({
      term: t,
      unsupported: (P.unsupported || []).includes(t),
      cardCount: cards.length,
      // does a recommended card's OWN text name the term?
      cardNamesTerm: cards.some((c) => c.includes(t)),
      headSaysNoTemplate: /也给不了你|也没有/.test(head),
      hasChip: !!empty.querySelector('[data-act="use-chip"]'),
      head: head.replace(/\s+/g, ' ').trim().slice(0, 120),
      cards: cards.map((c) => c.slice(0, 140)),
    });
  }
  q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true }));
  return out;
});
writeFileSync(OUT + 'b2e-authoritative.json', JSON.stringify(res, null, 1));
console.log('zero-hit terms:', res.length);
console.log('get a NAMED template recommendation :', res.filter((r) => r.cardNamesTerm).length, '->', res.filter((r) => r.cardNamesTerm).map((r) => r.term).join(' '));
console.log('get generic "no template either"    :', res.filter((r) => r.headSaysNoTemplate).length);
console.log('get a chip button                   :', res.filter((r) => r.hasChip).length);
const un = res.filter((r) => r.unsupported);
console.log('\nunsupported (29) breakdown:');
console.log('  named template rec :', un.filter((r) => r.cardNamesTerm).length);
console.log('  generic no-template:', un.filter((r) => r.headSaysNoTemplate).length);
console.log('  chip button        :', un.filter((r) => r.hasChip).length);
const scene = res.filter((r) => !r.unsupported);
console.log('\nsceneIndex zero-hit breakdown:');
console.log('  named template rec :', scene.filter((r) => r.cardNamesTerm).length, '->', scene.filter((r) => r.cardNamesTerm).map((r) => r.term).join(' '));
console.log('  generic no-template:', scene.filter((r) => r.headSaysNoTemplate).length, '->', scene.filter((r) => r.headSaysNoTemplate).map((r) => r.term).join(' '));
console.log('\nsample: 餐厅 ->', JSON.stringify(res.find((r) => r.term === '餐厅'), null, 1));
console.log('sample: 金融 ->', JSON.stringify(res.find((r) => r.term === '金融'), null, 1));
await page.close(); await b.close();
