// C1/C2/C3: for all 30, does the row/detail panel point to the template layer?
// And do any of the 14 flagged schemes have a semantic template substitute?
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
const BASE = 'http://127.0.0.1:8611/prototypes/_selection/';
const OUT = 'deliverables/69-plan/redteam/';
const b = await Browser.launch({ width: 1440, height: 900 });
const page = await b.newPage({ width: 1440, height: 900 });
await page.goto(BASE, { settleMs: 1800 });

const ids = await page.eval(() => [...document.querySelectorAll('.ledger .row')].map((r) => r.dataset.id));
const out = [];
for (const id of ids) {
  const r = await page.eval((sid) => {
    const row = document.querySelector('.ledger .row[data-id="' + sid + '"]');
    row.click();
    window.__rowText = row.textContent.replace(/\s+/g, ' ').trim().slice(0, 400);
    return window.__rowText;
  }, id);
  await new Promise((res) => setTimeout(res, 260));
  const p = await page.eval(() => {
    const row = window.__rowText;
    const d = document.getElementById('detail');
    const body = document.getElementById('d-body');
    const txt = (body ? body.textContent : '').replace(/\s+/g, ' ').trim();
    const tplLinks = [...d.querySelectorAll('a')].filter((a) => /templates\//.test(a.getAttribute('href') || '')).map((a) => a.getAttribute('href'));
    // where does the warning live
    const warnEls = [...d.querySelectorAll('*')].filter((e) => /⚠/.test(e.textContent || '') && e.children.length === 0);
    return {
      rowText: row, panelLen: txt.length,
      panelLinks: [...d.querySelectorAll('a')].map((a) => a.getAttribute('href')),
      templateLinksInPanel: tplLinks,
      panelMentionsTemplateWord: /模板层|大众模板|M0[123]/.test(txt),
      tplMentions: (txt.match(/.{0,40}(模板层|大众模板|M0[123]).{0,60}/g) || []).slice(0, 4),
      warnNodes: warnEls.slice(0, 3).map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160)),
    };
  });
  out.push({ id, ...p });
  const closeBtn = await page.eval(() => { const c = document.getElementById('d-close'); if (c) { c.click(); return true; } return false; });
  await new Promise((res) => setTimeout(res, 120));
}
writeFileSync(OUT + 'c-all-panels.json', JSON.stringify(out, null, 1));
console.log('schemes checked', out.length);
console.log('panels with a templates/ link:', out.filter((r) => r.templateLinksInPanel.length).length);
console.log('panels mentioning 模板层/大众模板/M0x:', out.filter((r) => r.panelMentionsTemplateWord).length, '->', out.filter((r) => r.panelMentionsTemplateWord).map((r) => r.id).join(' '));
console.log('\nrow text contains ⚠:', out.filter((r) => /⚠/.test(r.rowText)).length, '->', out.filter((r) => /⚠/.test(r.rowText)).map((r) => r.id).join(' '));
console.log('\n--- where the warning text lives (sample) ---');
for (const r of out.slice(0, 3)) console.log(r.id, JSON.stringify(r.warnNodes));
await page.close(); await b.close();
