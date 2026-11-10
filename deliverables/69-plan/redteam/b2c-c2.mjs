// B2c: is the template block a real recommendation or just a full-list dump?
// C2: does a hard scheme's detail panel point anywhere?
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8611/prototypes/_selection/';
const OUT = 'deliverables/69-plan/redteam/';
const b = await Browser.launch({ width: 1440, height: 900 });
const page = await b.newPage({ width: 1440, height: 900 });
await page.goto(BASE, { settleMs: 1800 });

const tpl = await page.eval(() => {
  const q = document.getElementById('q');
  const P = window.STYLE_PROMPTS;
  const eTpl = document.getElementById('empty-tpl');
  const terms = Object.keys(P.sceneIndex).concat(P.unsupported);
  const out = [];
  for (const t of terms) {
    q.value = t; q.dispatchEvent(new Event('input', { bubbles: true }));
    if (document.getElementById('ledger').querySelectorAll('.row').length) continue;
    const cards = [...eTpl.querySelectorAll('.tpl-cards a')].map((a) => a.textContent.replace(/\s+/g, ' ').trim());
    const all = [...eTpl.querySelectorAll('.tpl-all a')].map((a) => a.textContent.replace(/\s+/g, ' ').trim());
    const head = (eTpl.querySelector('.tpl-empty-head') || {}).textContent || '';
    const cardsText = cards.join(' | ');
    const allText = all.join(' | ');
    out.push({
      term: t, unsupported: (P.unsupported || []).includes(t),
      head: head.replace(/\s+/g, ' ').trim(),
      recommendedCards: cards.length,
      cardNamesTerm: cardsText.includes(t),
      allListNamesTerm: allText.includes(t),
      cardsText: cardsText.slice(0, 220),
    });
  }
  q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true }));
  return out;
});
writeFileSync(OUT + 'b2c-tpl.json', JSON.stringify(tpl, null, 1));
console.log('zero-hit terms:', tpl.length);
console.log('headline recommends a card:', tpl.filter((r) => r.recommendedCards > 0).length);
console.log('recommended card text names the term:', tpl.filter((r) => r.cardNamesTerm).length);
console.log('term appears only in the full list:', tpl.filter((r) => r.allListNamesTerm && !r.cardNamesTerm).map((r) => r.term).join(' '));
console.log('term appears nowhere:', tpl.filter((r) => !r.allListNamesTerm).map((r) => r.term).join(' '));
const un = tpl.filter((r) => r.unsupported);
console.log('\n--- unsupported words: does a template card name them? ---');
console.log('yes:', un.filter((r) => r.cardNamesTerm).map((r) => r.term).join(' '));
console.log('no :', un.filter((r) => !r.cardNamesTerm).map((r) => r.term).join(' '));
console.log('\nsample head for 金融:', (tpl.find((r) => r.term === '金融') || {}).head);

// ---- C: open a hard scheme (S14 zero-g) and dump the detail panel
const detail = await page.eval(() => {
  const q = document.getElementById('q');
  q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true }));
  const row = document.querySelector('.ledger .row[data-id="S14"]');
  if (row) row.click();
  return !!row;
});
await new Promise((r) => setTimeout(r, 900));
const panel = await page.eval(() => {
  const d = document.getElementById('detail');
  if (!d || d.hidden) return { hidden: true };
  const body = document.getElementById('d-body');
  const txt = (body ? body.textContent : '').replace(/\s+/g, ' ').trim();
  const links = [...d.querySelectorAll('a')].map((a) => a.textContent.trim() + ' -> ' + a.getAttribute('href'));
  return {
    hidden: false, no: (document.getElementById('d-no') || {}).textContent,
    cn: (document.getElementById('d-cn') || {}).textContent,
    textLen: txt.length, links,
    mentionsTemplate: /模板|M01|M02|M03/.test(txt),
    templateMentions: (txt.match(/.{0,60}(模板|M0[123]).{0,80}/g) || []).slice(0, 8),
    hasWarning: /⚠/.test(txt),
    warnSnippets: (txt.match(/.{0,50}⚠.{0,110}/g) || []).slice(0, 6),
    panelText: txt.slice(0, 2500),
  };
});
writeFileSync(OUT + 'c2-panel-S14.json', JSON.stringify(panel, null, 1));
console.log('\n=== S14 detail panel ===');
console.log('mentionsTemplate', panel.mentionsTemplate, 'links', JSON.stringify(panel.links));
console.log('warn snippets:', JSON.stringify(panel.warnSnippets, null, 1));

await page.screenshot({ path: OUT + 'shots/c-panel-S14.jpg', format: 'jpeg', quality: 76 });
await page.close(); await b.close();
