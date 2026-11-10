// P14 — 推荐改动（单点）的定量效果：
//  A. 现状（点芯片后 rail 仍展开）
//  B. rail 自动收起
//  C. B + 模板带折成一行
//  D. C + 结果区顶部不再被页头顶下去
import { Browser, openPage, settle, sleep, setFold, setSort } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '8901';
const browser = await Browser.launch({ width: 1200, height: 900 });
const out = [];

async function coffeeRun(label, { collapseRail = false, foldTpl = false, chip = '咖啡店' } = {}) {
  const page = await openPage(browser, { width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);
  await setFold(page, 'rail-fold', true);
  await sleep(400);
  await page.eval(`(() => { const b=[...document.querySelectorAll('#flt-scene button')].find(x=>x.textContent.trim().startsWith(${JSON.stringify(chip)})); if(b)b.click(); return !!b; })()`);
  await sleep(1000);
  if (collapseRail) { await setFold(page, 'rail-fold', false); await sleep(600); }
  if (foldTpl) {
    await page.eval(`(() => {
      const s=document.querySelector('#tpl-strip'); if(!s||s.hidden) return 'no-strip';
      const det=document.createElement('details');
      det.id='__tplfold';
      const sum=document.createElement('summary');
      sum.textContent='现成模板（'+s.querySelectorAll('.tpl-card').length+' 张）';
      sum.style.cssText='min-height:32px;display:flex;align-items:center;font-size:13px;font-weight:600;cursor:pointer;color:#43413b;padding:4px 0';
      s.parentNode.insertBefore(det, s);
      det.appendChild(sum); det.appendChild(s);
      return 'folded';
    })()`);
    await sleep(500);
  }
  await page.eval('window.scrollTo(0,0)');
  await sleep(300);
  const r = await page.eval(`(() => {
    const rows=[...document.querySelectorAll('#ledger .row')]; const vh=innerHeight;
    const tpl=document.querySelector('#tpl-strip');
    const tplDet=document.getElementById('__tplfold');
    const tplBox = tplDet ? tplDet.getBoundingClientRect() : (tpl&&!tpl.hidden ? tpl.getBoundingClientRect() : null);
    const b0=rows[0]?rows[0].getBoundingClientRect():null;
    const full=rows.filter(el=>{const b=el.getBoundingClientRect();return b.top>=-0.5&&b.bottom<=vh+0.5;}).length;
    const part=rows.filter(el=>{const b=el.getBoundingClientRect();return b.bottom>0&&b.top<vh;}).length;
    return { rows:rows.length, full, part,
      tplH: tplBox?+tplBox.height.toFixed(1):0,
      railH:+document.getElementById('rail-fold').getBoundingClientRect().height.toFixed(1),
      firstTop: b0?+(b0.top+scrollY).toFixed(1):null,
      firstH: b0?+b0.height.toFixed(1):null,
      firstScreen: b0?+(((b0.top+scrollY)/vh)+1).toFixed(2):null,
      firstScreenSlack: b0?+(vh-(b0.top+scrollY+b0.height)).toFixed(1):null,
      docH:document.documentElement.scrollHeight, screens:+(document.documentElement.scrollHeight/vh).toFixed(3) };
  })()`);
  out.push({ label, ...r });
  console.log(label.padEnd(34), 'rows=' + r.rows, 'full=' + r.full, 'part=' + r.part,
    'rail=' + r.railH, 'tpl=' + r.tplH, 'firstTop=' + r.firstTop, 'firstScreen=' + r.firstScreen,
    'slack=' + r.firstScreenSlack, 'screens=' + r.screens);
  await page.close();
}

await coffeeRun('A 现状（rail 仍展开）');
await coffeeRun('B rail 自动收起', { collapseRail: true });
await coffeeRun('C B + 模板带折一行', { collapseRail: true, foldTpl: true });
await coffeeRun('D 现状 + 模板带折一行', { foldTpl: true });
await coffeeRun('E 烘焙（3行）现状');
await coffeeRun('F 烘焙 rail收起+模板折', { collapseRail: true, foldTpl: true, chip: '烘焙' });

writeFileSync('deliverables/69-audit/data-p14-recommend.json', JSON.stringify(out, null, 2));
console.log('wrote data-p14-recommend.json');
await browser.close();
