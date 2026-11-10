// P10 — 逐档精确首卡 & 截图取证。
import { Browser, openPage, settle, setSort, SORTS, sleep, measure } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '8901';
const SHOTS = 'deliverables/69-audit/shots';
const browser = await Browser.launch({ width: 1200, height: 900 });
const out = { tiers: [], shots: [] };

const TIERS = [
  { w: 360, h: 640, m: true, label: '360x640' },
  { w: 375, h: 667, m: true, label: '375x667' },
  { w: 375, h: 812, m: true, label: '375x812' },
  { w: 390, h: 844, m: true, label: '390x844' },
  { w: 414, h: 896, m: true, label: '414x896' },
  { w: 768, h: 1024, m: true, label: '768x1024' },
  { w: 1440, h: 900, m: false, label: '1440x900' },
];

for (const t of TIERS) {
  const page = await openPage(browser, { width: t.w, height: t.h, mobile: t.m, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);
  const rec = { label: t.label, vw: t.w, vh: t.h, perSort: {} };
  for (const [val, sl] of SORTS) {
    await setSort(page, val);
    await page.eval('window.scrollTo(0,0)');
    await sleep(300);
    const m = await page.eval(`(() => {
      const rows=[...document.querySelectorAll('#ledger .row')]; const vh=innerHeight;
      const ft=rows[0].getBoundingClientRect().top+scrollY;
      const hs=rows.map(el=>({id:el.dataset.id,h:+el.getBoundingClientRect().height.toFixed(1)}));
      const sl=hs.map(d=>({id:d.id,slack:+(vh-(ft+d.h)).toFixed(1)})).sort((a,b)=>a.slack-b.slack);
      const full=rows.filter(el=>{const b=el.getBoundingClientRect();return b.top>=-0.5&&b.bottom<=vh+0.5;}).length;
      const vis=rows.filter(el=>{const b=el.getBoundingClientRect();return b.bottom>0&&b.top<vh;}).length;
      return { full, partiallyVisible: vis, firstTop:+ft.toFixed(1), capacity:+(vh-ft).toFixed(1),
               firstId:rows[0].dataset.id, firstH:hs[0].h,
               firstSlack:+(vh-(ft+hs[0].h)).toFixed(1),
               worstId:sl[0].id, worstH:hs.find(x=>x.id===sl[0].id).h, worstSlack:sl[0].slack,
               sh:document.documentElement.scrollHeight, screens:+(document.documentElement.scrollHeight/vh).toFixed(3),
               overflowX: document.documentElement.scrollWidth-innerWidth };
    })()`);
    rec.perSort[val] = { ...m, sortLabel: sl };
    console.log(t.label.padEnd(10), val.padEnd(6), 'full=' + m.full, 'part=' + m.partiallyVisible,
      'cap=' + String(m.capacity).padEnd(6), 'first=' + m.firstId + '(' + m.firstH + ')',
      'slack=' + String(m.firstSlack).padEnd(7), 'worst=' + m.worstId + '/' + m.worstSlack,
      'screens=' + m.screens, 'ovf=' + m.overflowX);
  }
  // 截图：默认排序首屏、闸门排序首屏、整页
  await setSort(page, 'n');
  await page.eval('window.scrollTo(0,0)');
  await sleep(400);
  const p1 = `${SHOTS}/${t.label}-fold-n.png`;
  await page.screenshot({ path: p1, format: 'png' });
  await setSort(page, 'gate');
  await page.eval('window.scrollTo(0,0)');
  await sleep(400);
  const p2 = `${SHOTS}/${t.label}-fold-gate.png`;
  await page.screenshot({ path: p2, format: 'png' });
  rec.shots = [p1, p2];
  out.shots.push(p1, p2);
  out.tiers.push(rec);
  await page.close();
}

// 390 整页长图 + 关键交互截图
{
  const page = await openPage(browser, { width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);
  const full = `${SHOTS}/390x844-fullpage.png`;
  await page.screenshot({ path: full, format: 'png', fullPage: true });
  out.shots.push(full);

  // 咖啡店芯片路径
  await page.eval(`(() => { document.getElementById('rail-fold').open = true; return 1; })()`);
  await sleep(700);
  const railOpen = `${SHOTS}/390x844-rail-open.png`;
  await page.screenshot({ path: railOpen, format: 'png' });
  out.shots.push(railOpen);

  await page.eval(`(() => { const b=[...document.querySelectorAll('#flt-scene button')].find(x=>x.textContent.trim().startsWith('咖啡店')); if(b)b.click(); return !!b; })()`);
  await sleep(900);
  await page.eval('window.scrollTo(0,0)');
  await sleep(300);
  const coffeeTop = `${SHOTS}/390x844-coffee-top.png`;
  await page.screenshot({ path: coffeeTop, format: 'png' });
  const coffeeInfo = await page.eval(`(() => {
    const rows=[...document.querySelectorAll('#ledger .row')]; const vh=innerHeight;
    return { rows: rows.length, ids: rows.map(r=>r.dataset.id),
      full: rows.filter(el=>{const b=el.getBoundingClientRect();return b.top>=-0.5&&b.bottom<=vh+0.5;}).length,
      firstTop: rows.length? +(rows[0].getBoundingClientRect().top+scrollY).toFixed(0):null,
      sh: document.documentElement.scrollHeight, screens: +(document.documentElement.scrollHeight/vh).toFixed(3),
      barH: +document.querySelector('.bar').getBoundingClientRect().height.toFixed(0),
      railH: +document.getElementById('rail-fold').getBoundingClientRect().height.toFixed(0) };
  })()`);
  out.shots.push(coffeeTop);
  out.coffee = coffeeInfo;
  console.log('coffee chip result:', JSON.stringify(coffeeInfo));

  // 滚到结果行可见的位置再截一张
  await page.eval('window.scrollTo(0, 1700)');
  await sleep(400);
  const coffeeScroll = `${SHOTS}/390x844-coffee-scrolled.png`;
  await page.screenshot({ path: coffeeScroll, format: 'png' });
  out.shots.push(coffeeScroll);

  // 空状态（搜「咖啡店」）
  await page.eval(`(() => { const r=document.querySelector('#reset'); if(r) r.click(); const q=document.querySelector('#q'); q.value='咖啡店'; q.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
  await sleep(900);
  await page.eval('window.scrollTo(0,0)');
  await sleep(300);
  const emptyShot = `${SHOTS}/390x844-empty-coffee.png`;
  await page.screenshot({ path: emptyShot, format: 'png' });
  out.shots.push(emptyShot);
  out.emptyState = await page.eval(`(() => { const e=document.querySelector('#empty'); return { hidden: e.hidden, sh: document.documentElement.scrollHeight, screens:+(document.documentElement.scrollHeight/innerHeight).toFixed(3), text:(e.innerText||'').replace(/\\s+/g,' ').slice(0,400) }; })()`);

  // 详情面板（深链 #S12）
  await page.eval(`location.hash='#S12'`);
  await sleep(1000);
  const detailShot = `${SHOTS}/390x844-detail-S12.png`;
  await page.screenshot({ path: detailShot, format: 'png' });
  out.shots.push(detailShot);
  out.detail = await page.eval(`(() => { const d=document.querySelector('#detail'); const b=d.getBoundingClientRect(); return { open:!d.hidden, w:+b.width.toFixed(0), h:+b.height.toFixed(0), scrollH:d.scrollHeight, screens:+(d.scrollHeight/innerHeight).toFixed(2), pos:getComputedStyle(d).position }; })()`);
  console.log('detail:', JSON.stringify(out.detail));
  await page.close();
}

writeFileSync('deliverables/69-audit/data-p10-tiers.json', JSON.stringify(out, null, 2));
console.log('\nwrote data-p10-tiers.json + ' + out.shots.length + ' shots');
await browser.close();
