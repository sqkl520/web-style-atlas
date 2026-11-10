// 探针 18：全部 44 词的「同名芯片」路径（补齐任务 1 表的最后一列）。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, readFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 1440, height: 900 });
const page = await b.newPage({ width: 1440, height: 900 });
await page.goto(BASE, { settleMs: 1500 });

const terms = JSON.parse(readFileSync(OUT + '/terms.json', 'utf8'));
const out = [];

for (const term of terms) {
  // 复位
  await page.eval(() => {
    window.benchClearSceneIds && window.benchClearSceneIds();
    const q = document.getElementById('q'); q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelectorAll('#flt-scene button, .scene-more button').forEach(x => x.setAttribute('aria-pressed', 'false'));
  });
  await sleep(120);
  // 1) 只搜词
  const searchOnly = await page.eval((t) => {
    const q = document.getElementById('q'); q.value = t; q.dispatchEvent(new Event('input', { bubbles: true }));
    return document.querySelectorAll('#ledger > li').length;
  }, term);
  // 2) 再点同名芯片
  const clicked = await page.eval((t) => {
    const btn = document.querySelector(`#flt-scene button[data-scene="${t}"], .scene-more button[data-scene="${t}"]`);
    if (!btn) return false;
    btn.click(); return true;
  }, term);
  await sleep(400);
  const after = await page.eval(() => {
    const strip = document.getElementById('tpl-strip');
    const vis = !!(strip && !strip.hidden && strip.getBoundingClientRect().height > 0);
    return {
      rows: document.querySelectorAll('#ledger > li').length,
      ids: [...document.querySelectorAll('#ledger > li')].map(li => li.getAttribute('data-id')),
      count: (document.getElementById('count')?.innerText || '').replace(/\s+/g, ' ').trim(),
      stripVisible: vis,
      stripCards: vis ? [...strip.querySelectorAll('.tpl-card')].map(c => c.dataset.tpl) : [],
      emptyVisible: !document.getElementById('empty')?.hidden,
    };
  });
  out.push({ term, searchOnly, clicked, ...after });
  process.stdout.write('.');
}
console.log('');
writeFileSync(OUT + '/probe-chips-all.json', JSON.stringify(out, null, 1));
console.log('词\t只搜\t点芯片\t模板带');
for (const r of out) console.log(`${r.term}\t${r.searchOnly}\t${r.rows} [${r.ids.join(',')}]\t${r.stripCards.join(',') || '—'}`);
console.log('\n点芯片后仍 0 行:', out.filter(r => r.rows === 0).map(r => r.term).join(' ') || '（无）');
console.log('点芯片比只搜更少:', out.filter(r => r.rows < r.searchOnly).map(r => `${r.term}(${r.searchOnly}→${r.rows})`).join(' ') || '（无）');
await page.close();
await b.close();
