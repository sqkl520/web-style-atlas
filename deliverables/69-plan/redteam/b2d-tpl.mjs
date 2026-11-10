// B2d: dump the exact rendered template block for 3 representative words, verbatim.
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
const BASE = 'http://127.0.0.1:8611/prototypes/_selection/';
const OUT = 'deliverables/69-plan/redteam/';
const b = await Browser.launch({ width: 1440, height: 900 });
const page = await b.newPage({ width: 1440, height: 900 });
await page.goto(BASE, { settleMs: 1800 });
const out = {};
for (const term of ['餐厅', '电商', '金融', '咖啡店', '花店', '物流']) {
  out[term] = await page.eval((t) => {
    const q = document.getElementById('q');
    q.value = t; q.dispatchEvent(new Event('input', { bubbles: true }));
    const eTpl = document.getElementById('empty-tpl');
    const visible = eTpl && !eTpl.hidden;
    return {
      rows: document.getElementById('ledger').querySelectorAll('.row').length,
      visible,
      cardCount: eTpl ? eTpl.querySelectorAll('.tpl-cards a').length : 0,
      html: visible ? eTpl.innerHTML.replace(/\s+/g, ' ').slice(0, 2200) : '',
      text: visible ? eTpl.textContent.replace(/\s+/g, ' ').trim() : '',
    };
  }, term);
}
writeFileSync(OUT + 'b2d-tpl-verbatim.json', JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) {
  console.log('\n#### ' + k + '  rows=' + v.rows + ' cards=' + v.cardCount);
  console.log(v.text);
}
await page.close(); await b.close();
