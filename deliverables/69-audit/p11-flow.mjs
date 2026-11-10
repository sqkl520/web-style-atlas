// P11 — 筛选后的面板行为 + 向导路径成本。
import { Browser, openPage, settle, sleep, setFold } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '8901';
const browser = await Browser.launch({ width: 1200, height: 900 });
const out = {};

// --- A) 点芯片后，筛选面板会不会自动收起？
{
  const page = await openPage(browser, { width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);
  await setFold(page, 'rail-fold', true);
  await sleep(400);
  const beforeClick = await page.eval(`(() => {
    const rf=document.getElementById('rail-fold'); const d=document.documentElement;
    return { railOpen: rf.open, railH:+rf.getBoundingClientRect().height.toFixed(0),
      sh:d.scrollHeight, screens:+(d.scrollHeight/innerHeight).toFixed(3),
      firstRowTop:+document.querySelector('#ledger .row').getBoundingClientRect().top.toFixed(0), rows:document.querySelectorAll('#ledger .row').length };
  })()`);
  await page.eval(`(() => { const b=[...document.querySelectorAll('#flt-scene button')].find(x=>x.textContent.trim().startsWith('咖啡店')); if(b)b.click(); return !!b; })()`);
  await sleep(1000);
  const afterClick = await page.eval(`(() => {
    const rf=document.getElementById('rail-fold'); const d=document.documentElement;
    const rows=[...document.querySelectorAll('#ledger .row')];
    const b=rows[0]?rows[0].getBoundingClientRect():null;
    return { railOpen: rf.open, railH:+rf.getBoundingClientRect().height.toFixed(0),
      sh:d.scrollHeight, screens:+(d.scrollHeight/innerHeight).toFixed(3), rows:rows.length,
      firstRowTop: b?+(b.top+scrollY).toFixed(0):null,
      firstRowScreen: b?+(((b.top+scrollY)/innerHeight)+1).toFixed(2):null,
      scrollY:+scrollY.toFixed(0) };
  })()`);
  // 手动收起筛选后
  await setFold(page, 'rail-fold', false);
  await sleep(600);
  const afterCollapse = await page.eval(`(() => {
    const rows=[...document.querySelectorAll('#ledger .row')]; const vh=innerHeight;
    const b=rows[0].getBoundingClientRect();
    const full=rows.filter(el=>{const r=el.getBoundingClientRect();return r.top>=-0.5&&r.bottom<=vh+0.5;}).length;
    return { rows:rows.length, firstRowTop:+(b.top+scrollY).toFixed(0), firstRowScreen:+(((b.top+scrollY)/vh)+1).toFixed(2),
      firstRowH:+b.height.toFixed(0), firstScreenSlack:+(vh-(b.top+scrollY+b.height)).toFixed(1), fullInFirst:full,
      sh:document.documentElement.scrollHeight, screens:+(document.documentElement.scrollHeight/vh).toFixed(3) };
  })()`);
  out.filterFlow = { beforeClick, afterClick, afterCollapse };
  console.log('筛选流程:', JSON.stringify(out.filterFlow, null, 1));
  await page.close();
}

// --- B) 向导路径：几步 + 结果页多少屏
{
  const page = await openPage(browser, { width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/wizard.html`, { settleMs: 1500 });
  await settle(page, 1500);
  const start = await page.eval(`(() => {
    const d=document.documentElement;
    const qs=[...document.querySelectorAll('.wz-q, fieldset, [data-q]')].map(e=>e.textContent.trim().slice(0,40));
    const btns=[...document.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(Boolean);
    const opts=[...document.querySelectorAll('input[type=radio], input[type=checkbox], .wz-opt')].length;
    return { sh:d.scrollHeight, screens:+(d.scrollHeight/innerHeight).toFixed(2), questions:qs.length,
      buttons:btns.slice(0,10), optionCount:opts,
      heading:(document.querySelector('h1,h2')||{}).textContent };
  })()`);
  out.wizard = { start };
  console.log('向导首屏:', JSON.stringify(start));
  await page.close();
}

writeFileSync('deliverables/69-audit/data-p11-flow.json', JSON.stringify(out, null, 2));
console.log('wrote data-p11-flow.json');
await browser.close();
