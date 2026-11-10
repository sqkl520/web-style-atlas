// 探针 21：B 的关键分叉 —— 「搜餐厅得到空页面」取决于**输入路径**。
// 三条路各跑一遍：① 在 #q 里打字 ② 点左侧行业芯片 ③ 先搜再点芯片。
// 记录 rows 数、#tpl-strip / #empty-tpl 的显隐与内容。
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const STATE = () => {
  const strip = document.getElementById('tpl-strip');
  const empty = document.getElementById('empty-tpl');
  const led = document.getElementById('ledger');
  const rows = document.querySelectorAll('#ledger .row').length;
  const vis = (el) => el && !el.hidden && getComputedStyle(el).display !== 'none';
  return {
    rows,
    stripShown: vis(strip), stripText: vis(strip) ? strip.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) : '',
    emptyShown: vis(empty), emptyText: vis(empty) ? empty.textContent.replace(/\s+/g, ' ').trim().slice(0, 200) : '',
    ledgerText: led ? led.textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : '',
  };
};

const br = await Browser.launch({ width: 1440, height: 900 });
const T = ['餐厅', '咖啡店', '酒吧', '电商', '律师', '花店'];
for (const term of T) {
  console.log(`\n############ 「${term}」 ############`);

  // ① 打字
  let p = await br.newPage({ width: 1440, height: 900, dsf: 1 });
  await p.goto(PAGE, { settleMs: 2000 });
  await p.eval((q) => {
    const i = document.getElementById('q');
    i.value = q; i.dispatchEvent(new Event('input', { bubbles: true }));
    return 1;
  }, term);
  await sleep(600);
  let m = await p.eval(STATE);
  console.log(`  ① 打字      rows=${m.rows}  tplStrip=${m.stripShown}  emptyTpl=${m.emptyShown}`);
  if (m.stripText) console.log(`     strip: ${m.stripText}`);
  if (m.emptyText) console.log(`     empty: ${m.emptyText}`);
  await p.close();

  // ② 点芯片
  p = await br.newPage({ width: 1440, height: 900, dsf: 1 });
  await p.goto(PAGE, { settleMs: 2000 });
  const clicked = await p.eval((q) => {
    const btns = [...document.querySelectorAll('#flt-scene button, .scene-more button')];
    const b = btns.find((x) => x.getAttribute('data-scene') === q);
    if (!b) return 'no-chip';
    if (b.closest('.scene-more')) { const t = document.querySelector('.scene-toggle'); if (t) t.click(); }
    b.click(); return 'ok';
  }, term);
  await sleep(700);
  m = await p.eval(STATE);
  console.log(`  ② 点芯片(${clicked}) rows=${m.rows}  tplStrip=${m.stripShown}  emptyTpl=${m.emptyShown}`);
  if (m.stripText) console.log(`     strip: ${m.stripText}`);
  if (m.emptyText) console.log(`     empty: ${m.emptyText}`);
  await p.close();
}
await br.close();
