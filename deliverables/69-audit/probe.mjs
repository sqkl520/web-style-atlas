// 探针：对给定词表逐个真机搜索。用法：node probe.mjs <terms.json> <out.json>
// 只读：只导航、输入、读 DOM、截图。
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, readFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const TERMS_FILE = process.argv[2];
const OUT_FILE = process.argv[3];
const terms = JSON.parse(readFileSync(TERMS_FILE, 'utf8'));

const b = await Browser.launch({ width: 1440, height: 900 });
const page = await b.newPage({ width: 1440, height: 900 });
await page.goto(BASE, { settleMs: 1200 });

const results = [];
for (const term of terms) {
  const r = await page.eval((t) => {
    const q = document.getElementById('q');
    q.value = t;
    q.dispatchEvent(new Event('input', { bubbles: true }));
    const count = document.getElementById('count');
    const rows = document.querySelectorAll('#ledger > li').length;
    const empty = document.getElementById('empty');
    const emptyVisible = !!(empty && !empty.hidden && empty.getBoundingClientRect().height > 0);
    const emptyText = emptyVisible ? empty.innerText.replace(/\s+/g, ' ').trim() : '';
    const etpl = document.getElementById('empty-tpl');
    const etplVisible = !!(etpl && !etpl.hidden && etpl.getBoundingClientRect().height > 0);
    const etplCards = etplVisible ? [...etpl.querySelectorAll('.tpl-card')].map(c => c.dataset.tpl) : [];
    const etplText = etplVisible ? etpl.innerText.replace(/\s+/g, ' ').trim() : '';
    const strip = document.getElementById('tpl-strip');
    const stripVisible = !!(strip && !strip.hidden && strip.getBoundingClientRect().height > 0);
    const stripCards = stripVisible ? [...strip.querySelectorAll('.tpl-card')].map(c => c.dataset.tpl) : [];
    const stripLead = stripVisible ? (document.getElementById('tpl-strip-lead').innerText || '').replace(/\s+/g, ' ').trim() : '';
    const countText = (count && count.innerText || '').replace(/\s+/g, ' ').trim();
    return { rows, countText, emptyVisible, emptyText, etplVisible, etplCards, etplText,
             stripVisible, stripCards, stripLead };
  }, term);
  results.push({ term, ...r });
  process.stdout.write('.');
}
console.log('\n');
writeFileSync(OUT_FILE, JSON.stringify(results, null, 1));
console.log(results.map(r =>
  `${r.term}\trows=${r.rows}\tempty=${r.emptyVisible}\tetpl=${r.etplVisible}[${r.etplCards}]\tstrip=${r.stripVisible}[${r.stripCards}]`).join('\n'));
await page.close();
await b.close();
