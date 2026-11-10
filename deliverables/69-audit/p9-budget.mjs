// P9 — 「还能加多少 chrome」的地板实验：在 #ledger 之前插入 N px 的块，
// 测 390x844 下首屏完整卡数何时从 1 掉到 0。以及排序状态是否持久化。
import { Browser, openPage, settle, setSort, SORTS, sleep } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '8901';
const browser = await Browser.launch({ width: 1200, height: 900 });
const out = { budget: [], persistence: null };

for (const add of [0, 5, 10, 11, 12, 20, 40, 44, 60]) {
  const page = await openPage(browser, { width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);
  if (add > 0) {
    await page.eval(`(() => {
      const d=document.createElement('div');
      d.style.cssText='height:${add}px;background:transparent';
      document.querySelector('#ledger').before(d);
      return 1;
    })()`);
    await sleep(400);
  }
  const per = {};
  for (const val of ['n', 'gate']) {
    await setSort(page, val);
    await page.eval('window.scrollTo(0,0)');
    await sleep(200);
    per[val] = await page.eval(`(() => {
      const rows=[...document.querySelectorAll('#ledger .row')]; const vh=innerHeight;
      const full=rows.filter(el=>{const b=el.getBoundingClientRect();return b.top>=-0.5&&b.bottom<=vh+0.5;}).length;
      const ft=rows[0].getBoundingClientRect().top+scrollY;
      const hs=rows.map(el=>+el.getBoundingClientRect().height.toFixed(1));
      return {full, firstTop:+ft.toFixed(1), slack:+(vh-(ft+Math.max(...hs))).toFixed(1)};
    })()`);
  }
  out.budget.push({ addedPx: add, ...per });
  console.log('+' + String(add).padEnd(3) + 'px  firstTop=' + per.n.firstTop,
    '| sort=n full=' + per.n.full, 'slack=' + per.n.slack,
    '| sort=gate full=' + per.gate.full, 'slack=' + per.gate.slack);
  await page.close();
}

// 排序 / 滚动位置是否持久化（刷新后还在不在）
{
  const page = await openPage(browser, { width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);
  await setSort(page, 'gate');
  await page.eval('window.scrollTo(0, 6000)');
  await sleep(600);
  const before = await page.eval(`({sort:(document.querySelector('#sort')||{}).value, y:+scrollY.toFixed(0), hash:location.hash, ls:Object.keys(localStorage).length, ss:Object.keys(sessionStorage).length})`);
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1200);
  const after = await page.eval(`({sort:(document.querySelector('#sort')||{}).value, y:+scrollY.toFixed(0), hash:location.hash, ls:Object.keys(localStorage).length})`);
  out.persistence = { before, after, sortPersisted: before.sort === after.sort, scrollPersisted: before.y === after.y };
  console.log('持久化: 改前', JSON.stringify(before), '刷新后', JSON.stringify(after));
  await page.close();
}

// 详情面板：同时只能开一个，无法并排比较
{
  const page = await openPage(browser, { width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);
  const cmp = await page.eval(`(() => {
    const d=document.querySelector('#detail');
    return { detailCount: document.querySelectorAll('#detail').length,
             detailIsFullscreen: d ? getComputedStyle(d).position : null,
             detailWidth: d ? +d.getBoundingClientRect().width.toFixed(0) : null,
             vw: innerWidth,
             hasCompareControl: !!document.querySelector('[data-compare], .compare, #compare'),
             buttonsInDetailHead: [...document.querySelectorAll('.detail-head button')].map(b=>b.textContent.trim()) };
  })()`);
  out.detail = cmp;
  console.log('详情面板:', JSON.stringify(cmp));
  await page.close();
}

writeFileSync('deliverables/69-audit/data-p9-budget.json', JSON.stringify(out, null, 2));
console.log('\nwrote data-p9-budget.json');
await browser.close();
