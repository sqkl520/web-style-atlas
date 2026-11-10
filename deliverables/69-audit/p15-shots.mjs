// P15 — 收尾截图：现状问题 vs 推荐改动后。
import { Browser, openPage, settle, sleep, setFold } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '8901';
const S = 'deliverables/69-audit/shots';
const browser = await Browser.launch({ width: 1200, height: 900 });
const shots = [];

async function shot(page, name) {
  const p = `${S}/${name}.png`;
  await page.screenshot({ path: p, format: 'png' });
  shots.push(p);
  return p;
}

// 现状：点「咖啡店」之后的首屏（首屏 0 张卡，首卡在 3.48 屏）
{
  const page = await openPage(browser, { width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);
  await setFold(page, 'rail-fold', true);
  await sleep(400);
  await page.eval(`(() => { const b=[...document.querySelectorAll('#flt-scene button')].find(x=>x.textContent.trim().startsWith('咖啡店')); if(b)b.click(); return 1; })()`);
  await sleep(1000);
  await page.eval('window.scrollTo(0,0)');
  await sleep(300);
  await shot(page, 'A1-390-coffee-railopen-firstscreen');
  await page.eval('window.scrollTo(0,1100)');
  await sleep(400);
  await shot(page, 'A2-390-coffee-railopen-screen2');
  await page.close();
}

// 推荐改动后：rail 收起 + 模板带折一行
{
  const page = await openPage(browser, { width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);
  await setFold(page, 'rail-fold', true);
  await sleep(400);
  await page.eval(`(() => { const b=[...document.querySelectorAll('#flt-scene button')].find(x=>x.textContent.trim().startsWith('咖啡店')); if(b)b.click(); return 1; })()`);
  await sleep(1000);
  await setFold(page, 'rail-fold', false);
  await sleep(500);
  await page.eval(`(() => {
    const s=document.querySelector('#tpl-strip'); if(!s||s.hidden) return 0;
    const det=document.createElement('details'); det.id='__tplfold';
    const sum=document.createElement('summary');
    sum.textContent='现成模板（'+s.querySelectorAll('.tpl-card').length+' 张）';
    sum.style.cssText='min-height:32px;display:flex;align-items:center;font-size:13px;font-weight:600;cursor:pointer;color:#43413b;padding:4px 0';
    s.parentNode.insertBefore(det, s); det.appendChild(sum); det.appendChild(s); return 1;
  })()`);
  await sleep(500);
  await page.eval('window.scrollTo(0,0)');
  await sleep(300);
  await shot(page, 'B1-390-coffee-recommended-firstscreen');
  await page.close();
}

// 375x812 的 2.8px 缺口（首卡被裁）
{
  const page = await openPage(browser, { width: 375, height: 812, mobile: true, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);
  await page.eval('window.scrollTo(0,0)');
  await sleep(300);
  await shot(page, 'C1-375x812-firstcard-clipped');
  await page.close();
}

// 1440 对照
{
  const page = await openPage(browser, { width: 1440, height: 900, mobile: false, dsf: 1 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);
  await page.eval('window.scrollTo(0,0)');
  await sleep(300);
  await shot(page, 'D1-1440x900-fold');
  await page.close();
}

writeFileSync('deliverables/69-audit/data-p15-shots.json', JSON.stringify(shots, null, 2));
console.log('shots: ' + shots.length);
await browser.close();
process.exit(0);
