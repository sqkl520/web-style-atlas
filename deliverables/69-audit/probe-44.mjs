// 探针 1：44 个行业词逐个真机搜索。
// 只读：只导航、输入、读取 DOM、截图。
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
mkdirSync(OUT + '/shots', { recursive: true });

import { readFileSync } from 'node:fs';
const terms = JSON.parse(readFileSync(process.argv[2] || 'D:/Web/style/deliverables/69-audit/terms.json', 'utf8'));
if (!terms.length) { console.error('no terms'); process.exit(1); }

const b = await Browser.launch({ width: 1440, height: 900 });
const page = await b.newPage({ width: 1440, height: 900 });
await page.goto(BASE, { settleMs: 1200 });

const results = [];
for (const term of terms) {
  const r = await page.eval((t) => {
    const q = document.getElementById('q');
    q.value = t;
    q.dispatchEvent(new Event('input', { bubbles: true }));
    // 同步读取：app.js 的 input 监听是同步 render
    const count = document.getElementById('count');
    const rows = document.querySelectorAll('#ledger > li').length;
    const empty = document.getElementById('empty');
    const emptyVisible = !!(empty && !empty.hidden && empty.getBoundingClientRect().height > 0);
    const emptyText = emptyVisible ? empty.innerText.replace(/\s+/g, ' ').trim().slice(0, 600) : '';
    const etpl = document.getElementById('empty-tpl');
    const etplVisible = !!(etpl && !etpl.hidden && etpl.getBoundingClientRect().height > 0);
    const etplCards = etplVisible ? [...etpl.querySelectorAll('.tpl-card')].map(c => c.dataset.tpl) : [];
    const etplText = etplVisible ? etpl.innerText.replace(/\s+/g, ' ').trim().slice(0, 800) : '';
    const strip = document.getElementById('tpl-strip');
    const stripVisible = !!(strip && !strip.hidden && strip.getBoundingClientRect().height > 0);
    const stripCards = stripVisible ? [...strip.querySelectorAll('.tpl-card')].map(c => c.dataset.tpl) : [];
    const stripLead = stripVisible ? (document.getElementById('tpl-strip-lead').innerText || '').replace(/\s+/g, ' ').trim() : '';
    const countText = (count && count.innerText || '').replace(/\s+/g, ' ').trim();
    // 模板相关可见文字总量（给"用户实际看到什么"用）
    return { rows, countText, emptyVisible, emptyText, etplVisible, etplCards, etplText,
             stripVisible, stripCards, stripLead };
  }, term);
  results.push({ term, ...r });
  process.stdout.write('.');
}
console.log('\n');
writeFileSync(OUT + '/probe-44-raw.json', JSON.stringify(results, null, 1));
const summary = results.map(r =>
  `${r.term}\trows=${r.rows}\tcount="${r.countText}"\tempty=${r.emptyVisible}\tetpl=${r.etplVisible}[${r.etplCards}]\tstrip=${r.stripVisible}[${r.stripCards}]`);
console.log(summary.join('\n'));
await page.close();
await b.close();
