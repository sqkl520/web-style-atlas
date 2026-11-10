// B2b: for every zero-row term, what does the empty state offer? Classify "dead end" vs "has an exit".
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
  const empty = document.getElementById('empty');
  const eTpl = document.getElementById('empty-tpl');
  const terms = Object.keys(P.sceneIndex).concat(P.unsupported);
  const out = [];
  for (const t of terms) {
    q.value = t; q.dispatchEvent(new Event('input', { bubbles: true }));
    const rows = document.getElementById('ledger').querySelectorAll('.row').length;
    if (rows > 0) continue;
    const chipBtn = empty.querySelector('[data-act="use-chip"]');
    const eNext = document.getElementById('e-next');
    const chipTxt = chipBtn ? chipBtn.textContent.trim() : '';
    const tplAnchor = eTpl ? eTpl.querySelector('a') : null;
    // does the template layer actually show anything?
    const tplVisible = eTpl ? !eTpl.hidden && eTpl.getBoundingClientRect().height > 0 : false;
    const tplText = tplVisible ? eTpl.textContent.replace(/\s+/g, ' ').trim() : '';
    out.push({
      term: t,
      unsupported: (P.unsupported || []).includes(t),
      direct: ((P.sceneIndex[t] || {}).direct || []).length,
      near: ((P.sceneIndex[t] || {}).near || []).length,
      chipButton: chipTxt,
      chipClaim: eNext ? eNext.textContent.replace(/\s+/g, ' ').trim() : '',
      tplVisible, tplNamed: tplAnchor ? tplAnchor.textContent.trim() : '',
      tplMentionsTerm: tplText.includes(t),
      tplTextLen: tplText.length,
    });
  }
  q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true }));
  return out;
});
writeFileSync(OUT + 'b2b-zerohit.json', JSON.stringify(res, null, 1));
console.log('zero-hit terms:', res.length);
const noChip = res.filter((r) => !r.chipButton);
const chipButNoRows = res.filter((r) => r.chipButton && /0 行|（0 行）/.test(r.chipClaim));
console.log('with a chip button:', res.filter((r) => r.chipButton).length);
console.log('with NO chip button:', noChip.length, '->', noChip.map((r) => r.term).join(' '));
console.log('chip claims 0 rows:', chipButNoRows.map((r) => r.term + ' [' + r.chipClaim + ']').join(' | '));
console.log('template layer visible:', res.filter((r) => r.tplVisible).length, '/', res.length);
console.log('template actually names the term:', res.filter((r) => r.tplMentionsTerm).length, '->', res.filter((r) => r.tplMentionsTerm).map((r) => r.term).join(' '));
console.log('\nterms with no template + no chip:');
for (const r of res) if (!r.chipButton && !r.tplVisible) console.log('  ', r.term);
console.log('\nfull table:');
for (const r of res) console.log([r.term.padEnd(6), 'chip=' + (r.chipButton ? 'Y' : 'N'), 'tpl=' + (r.tplVisible ? (r.tplMentionsTerm ? 'NAMES' : 'generic') : 'none'), r.chipClaim.slice(0, 60)].join('  '));
await page.close(); await b.close();
