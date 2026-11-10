// 探针 9：17 个零命中词的「芯片」这条备用路 —— 点同名芯片后有几行、模板带走不走。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, readFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 1440, height: 900 });
const page = await b.newPage({ width: 1440, height: 900 });
await page.goto(BASE, { settleMs: 1400 });

const zero = JSON.parse(readFileSync(OUT + '/probe-44-raw.json', 'utf8')).filter(r => r.rows === 0).map(r => r.term);
const out = [];
for (const term of zero) {
  // 1) 搜词
  await page.eval((t) => {
    const q = document.getElementById('q'); q.value = t; q.dispatchEvent(new Event('input', { bubbles: true }));
    // 复位芯片
    document.querySelectorAll('#flt-scene button, .scene-more button').forEach(x => x.setAttribute('aria-pressed', 'false'));
  }, term);
  await sleep(200);
  // 2) 找同名芯片并点（可能在折叠区里）
  const clicked = await page.eval((t) => {
    let btn = document.querySelector(`#flt-scene button[data-scene="${t}"], .scene-more button[data-scene="${t}"]`);
    if (!btn) return 'no-chip';
    btn.click();
    return 'ok';
  }, term);
  await sleep(450);
  const r = await page.eval(() => {
    const rows = [...document.querySelectorAll('#ledger > li')].map(li => li.getAttribute('data-id'));
    const strip = document.getElementById('tpl-strip');
    const stripVisible = !!(strip && !strip.hidden && strip.getBoundingClientRect().height > 0);
    return {
      rows: rows.length, ids: rows,
      count: (document.getElementById('count')?.innerText || '').replace(/\s+/g, ' ').trim(),
      stripVisible,
      stripCards: stripVisible ? [...strip.querySelectorAll('.tpl-card')].map(c => c.dataset.tpl) : [],
      stripLead: stripVisible ? (document.getElementById('tpl-strip-lead')?.innerText || '').replace(/\s+/g, ' ').trim() : '',
      emptyVisible: !document.getElementById('empty')?.hidden,
    };
  });
  out.push({ term, clicked, ...r });
  // 还原
  await page.eval(() => { window.benchClearSceneIds && window.benchClearSceneIds();
    const q = document.getElementById('q'); q.value=''; q.dispatchEvent(new Event('input',{bubbles:true})); });
  await sleep(200);
}

writeFileSync(OUT + '/probe-chips.json', JSON.stringify(out, null, 1));
console.log('词\t芯片\t行数\t模板带\t模板卡\t引导句');
for (const r of out) {
  console.log(`${r.term}\t${r.clicked}\t${r.rows} [${r.ids.join(',')}]\t${r.stripVisible}\t[${r.stripCards}]\t${r.stripLead.slice(0, 110)}`);
}
await page.close();
await b.close();
