// P4 — 典型用户路径实测：「想找适合咖啡店的方案」。
// 测搜索路径、芯片路径、向导路径、以及「比较 S12 与 S27」的代价。
import { Browser, openPage, settle, measure, sleep, setFold } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '8901';
const out = { at: new Date().toISOString(), paths: [] };
const browser = await Browser.launch({ width: 390, height: 844 });

const page = await openPage(browser, { width: 390, height: 844, mobile: true, dsf: 2 });
await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
await settle(page, 1500);

const state = async () => page.eval(`(() => {
  const rows = [...document.querySelectorAll('#ledger .row')];
  const vh = innerHeight;
  const y = scrollY;
  return {
    rows: rows.length,
    ids: rows.map(r => r.dataset.id),
    count: (document.querySelector('#count')||{}).textContent,
    docH: document.documentElement.scrollHeight,
    screens: +(document.documentElement.scrollHeight / vh).toFixed(3),
    emptyHidden: (document.querySelector('#empty')||{}).hidden,
    emptyText: (document.querySelector('#empty')||{}).hidden ? null : (document.querySelector('#empty').innerText||'').slice(0,220),
    tplStripHidden: (document.querySelector('#tpl-strip')||{}).hidden,
    tplStripText: (document.querySelector('#tpl-strip')||{}).hidden ? null : (document.querySelector('#tpl-strip').innerText||'').replace(/\\s+/g,' ').slice(0,300),
    chips: [...document.querySelectorAll('#flt-scene button')].map(b => ({t:b.textContent.trim(), pressed:b.getAttribute('aria-pressed')})).slice(0,25),
    chipCount: document.querySelectorAll('#flt-scene button').length,
    moreBtn: (()=>{const b=document.querySelector('.scene-more button, #scene-more'); return b? b.textContent.trim().slice(0,40):null})(),
    q: (document.querySelector('#q')||{}).value,
    scrollY: y,
    vh,
    // positions of specific rows for the compare test
    pos: Object.fromEntries(rows.map((r,i)=>{const b=r.getBoundingClientRect();return [r.dataset.id, {screen: +(((b.top+y)/vh)+1).toFixed(2), top: +(b.top+y).toFixed(0), h:+b.height.toFixed(0)}]})),
  };
})()`);

async function typeSearch(text) {
  await page.eval(`(() => {
    const q = document.querySelector('#q');
    q.value = ${JSON.stringify(text)};
    q.dispatchEvent(new Event('input', { bubbles: true }));
    return q.value;
  })()`);
  await sleep(800);
}
async function resetAll() {
  await page.eval(`(() => { const b = document.querySelector('#reset'); if (b) b.click(); return 1; })()`);
  await sleep(600);
}

// --- 0) 基线
out.paths.push({ name: 'baseline 无筛选', ...(await state()) });

// --- 1) 搜索框输入「咖啡店」
await typeSearch('咖啡店');
out.paths.push({ name: 'search「咖啡店」', ...(await state()) });

// --- 2) 搜索框输入「咖啡」
await typeSearch('咖啡');
out.paths.push({ name: 'search「咖啡」', ...(await state()) });

await resetAll();

// --- 3) 芯片路径：先看折叠态下多久能看到「咖啡店」芯片
const foldInfo = await page.eval(`(() => {
  const rail = document.querySelector('#rail-fold');
  const sum = document.querySelector('.rail-fold-sum');
  const b = sum.getBoundingClientRect();
  return { railOpen: rail.open, sumTop: +b.top.toFixed(1), sumH: +b.height.toFixed(1), sumText: sum.textContent.trim() };
})()`);
out.paths.push({ name: '芯片入口(折叠态)', foldInfo, ...(await state()) });

// 点开 rail 折叠
await setFold(page, 'rail-fold', true);
const afterOpen = await page.eval(`(() => {
  const chips = [...document.querySelectorAll('#flt-scene button')];
  const target = chips.find(b => b.textContent.trim().startsWith('咖啡'));
  const tb = target ? target.getBoundingClientRect() : null;
  return {
    chipFound: !!target,
    chipText: target ? target.textContent.trim() : null,
    chipScreen: tb ? +(((tb.top + scrollY) / innerHeight) + 1).toFixed(2) : null,
    chipTop: tb ? +tb.top.toFixed(0) : null,
    chipVisibleInViewport: tb ? (tb.top >= 0 && tb.bottom <= innerHeight) : null,
    docH: document.documentElement.scrollHeight,
    screens: +(document.documentElement.scrollHeight / innerHeight).toFixed(3),
    railH: +document.querySelector('#rail-fold').getBoundingClientRect().height.toFixed(0),
    firstRowTop: +document.querySelector('#ledger .row').getBoundingClientRect().top.toFixed(0),
  };
})()`);
out.paths.push({ name: '点开筛选折叠后', ...afterOpen });

// 点「咖啡店」芯片
await page.eval(`(() => {
  const chips = [...document.querySelectorAll('#flt-scene button')];
  const t = chips.find(b => b.textContent.trim().startsWith('咖啡店'));
  if (t) t.click();
  return !!t;
})()`);
await sleep(900);
await page.eval('window.scrollTo(0,0)');
await sleep(200);
out.paths.push({ name: '点「咖啡店」芯片后', ...(await state()) });

// 这些行各自在第几屏 + 首屏能看到几张
const chipResult = await page.eval(`(() => {
  const rows=[...document.querySelectorAll('#ledger .row')];
  const vh=innerHeight;
  const full=rows.filter(r=>{const b=r.getBoundingClientRect(); return b.top>=-0.5 && b.bottom<=vh+0.5;}).length;
  return { fullCards: full, rows: rows.map(r=>{const b=r.getBoundingClientRect(); return {id:r.dataset.id, top:+(b.top+scrollY).toFixed(0), h:+b.height.toFixed(0), screen:+(((b.top+scrollY)/vh)+1).toFixed(2)};}) };
})()`);
out.paths.push({ name: '咖啡店结果的行位置', ...chipResult });

await resetAll();
await page.eval('window.scrollTo(0,0)');
await sleep(300);

// --- 4) 比较 S12 与 S27 的代价（默认排序）
const cmp = await page.eval(`(() => {
  const rows=[...document.querySelectorAll('#ledger .row')];
  const vh=innerHeight;
  const get=id=>{const r=rows.find(x=>x.dataset.id===id); if(!r)return null; const b=r.getBoundingClientRect(); return {id, top:+(b.top+scrollY).toFixed(0), h:+b.height.toFixed(0), screen:+(((b.top+scrollY)/vh)+1).toFixed(2), idx: rows.indexOf(r)+1};};
  return { S12:get('S12'), S27:get('S27'), S06:get('S06'), S19:get('S19'), S13:get('S13'), vh, docScreens:+(document.documentElement.scrollHeight/vh).toFixed(3),
    // 两卡在同屏内才可能对比
    s12s27SameScreen: false };
})()`);
cmp.s12s27SameScreen = Math.abs(cmp.S12.screen - cmp.S27.screen) < 1;
cmp.distanceScreens = +Math.abs(cmp.S27.screen - cmp.S12.screen).toFixed(2);
out.paths.push({ name: 'compare S12 vs S27', ...cmp });

// --- 5) 键盘/URL 直达：#S12 能不能跳过滚动
await page.eval(`location.hash = '#S12'`);
await sleep(900);
const hashTest = await page.eval(`(() => {
  const d=document.querySelector('#detail');
  const r=document.querySelector('#ledger .row[data-id="S12"]');
  const b=r?r.getBoundingClientRect():null;
  return { detailOpen: d && !d.hidden, scrollY:+scrollY.toFixed(0), rowTopAfter: b?+b.top.toFixed(0):null, hash:location.hash,
    detailScrollH: d? d.scrollHeight:null, detailH: d? +d.getBoundingClientRect().height.toFixed(0):null };
})()`);
out.paths.push({ name: 'location.hash=#S12 深链', ...hashTest });

writeFileSync('deliverables/69-audit/data-p4-path.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.paths.map((p) => ({
  name: p.name, rows: p.rows, count: p.count, screens: p.screens,
  chipFound: p.chipFound, chipScreen: p.chipScreen, chipVisibleInViewport: p.chipVisibleInViewport,
  fullCards: p.fullCards, detailOpen: p.detailOpen, hash: p.hash,
})), null, 1));
await page.close();
await browser.close();
