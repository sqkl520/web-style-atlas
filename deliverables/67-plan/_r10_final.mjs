// _r10_final.mjs — 三个收官数字
// A) 折 4 长字段：闭合 / 只开这 4 条 / 全开，总阅读成本到底是升还是降
// B) 1440 档：A5 的「页头重排」把 h1 从 56px 压到 26px —— 审计说「1440 不受损」，实测？
// C) 首卡在 A5 下"完整可见"的到底是卡还是残片（卡内各部件是否都在视口内）
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const A5JS = `
  function addStyle(css){var s=document.createElement('style');s.setAttribute('data-lab','1');s.textContent=css;document.head.appendChild(s);}
  function railToSummary(){
    var rail=document.querySelector('.rail');
    var d=document.createElement('details');d.setAttribute('data-lab','1');
    var s=document.createElement('summary');s.textContent='筛选与场景反查 · 11 组 47 颗芯片';
    s.style.cssText='display:flex;align-items:center;font-size:14px;font-weight:600;padding:0 0 0 20px;min-height:48px;cursor:pointer;list-style-position:inside';
    var body=document.createElement('div'); while(rail.firstChild)body.appendChild(rail.firstChild);
    d.appendChild(s);d.appendChild(body);rail.appendChild(d);
    rail.style.maxHeight='none';rail.style.overflow='visible';
    rail.style.padding='0 16px 6px';rail.style.borderBottom='2px solid var(--ink)'; d.open=false;
  }
  function headFold(){
    var claim=document.querySelector('.mast-claim'), exit=document.querySelector('.mast-exit');
    var d=document.createElement('details');d.setAttribute('data-lab','1');
    var s=document.createElement('summary');s.textContent='这个图集是什么 · 想要现成模板去哪';
    s.style.cssText='font-size:13px;color:var(--ink-2);padding:6px 0;cursor:pointer;line-height:1.6;min-height:24px';
    claim.parentNode.insertBefore(d,claim); d.appendChild(s); d.appendChild(claim); d.appendChild(exit); d.open=false;
    addStyle('.mast{padding:12px 16px 10px;gap:8px}'
      +'.mast-kicker{font-size:12px;margin-bottom:4px}'
      +'.mast h1{font-size:26px;line-height:1.1}'
      +'.mast-wizard{margin-top:6px}.mast-wizard a{padding:6px 10px;font-size:14px}'
      +'.mast-facts{display:flex;margin-top:6px;gap:0}'
      +'.mast-facts>div{flex:1 1 0;border-top:1px solid var(--ink);padding-top:3px}'
      +'.mast-facts dt{font-size:11px;line-height:1.25}.mast-facts dd{font-size:17px;margin-top:0;line-height:1.15}'
      +'.mast-claim{margin-top:10px}.mast-exit{margin-top:8px}');
  }
  function barTight(){
    addStyle('.bar{padding-bottom:8px;gap:6px 8px}.search{flex:1 1 100%}.search input{padding:6px 8px}'
      +'.bar .count{order:3;font-size:12px}.bar .sort{order:4;gap:4px}.bar .sort label{display:none}'
      +'.sort select{padding:6px 6px;font-size:13px}.btn-quiet{padding:6px 8px;font-size:13px;order:5}');
  }
  var ROWFIX='.shots .shot img{max-height:100px}.shot{position:relative}'
    +'.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 4px;background:rgba(220,220,214,.92)}'
    +'.row-family{-webkit-line-clamp:1}.row{padding:9px 0;gap:14px}';
  window.__A5 = function(){ railToSummary(); headFold(); barTight(); addStyle(ROWFIX); return 1; };
`;

// A) 阅读成本
const COST = () => {
  const d = document.getElementById('detail');
  return { scrollH: d.scrollHeight, screens: +(d.scrollHeight / d.clientHeight).toFixed(2) };
};
const OPEN_LONG = () => { document.querySelectorAll('.field-long > details').forEach((x) => { x.open = true; }); return document.querySelectorAll('.field-long').length; };
const OPEN_ALL = () => { document.querySelectorAll('#d-body details').forEach((x) => { x.open = true; }); return document.querySelectorAll('#d-body details').length; };

// B) 1440 页头
const MAST = () => {
  const g = (s, p) => { const e = document.querySelector(s); if (!e) return null; return p === 'h' ? +e.getBoundingClientRect().height.toFixed(1) : getComputedStyle(e)[p]; };
  // 首屏文字面积占比（页头 / 视口）
  const r = document.querySelector('.mast').getBoundingClientRect();
  return {
    vh: window.innerHeight, vw: window.innerWidth,
    mastH: +r.height.toFixed(1), mastPct: +((r.height / window.innerHeight) * 100).toFixed(1),
    h1size: g('.mast h1', 'fontSize'), h1lines: (() => { const e = document.querySelector('.mast h1'); const lh = parseFloat(getComputedStyle(e).lineHeight); return Math.round(e.getBoundingClientRect().height / lh); })(),
    kicker: g('.mast-kicker', 'fontSize'), dd: g('.mast-facts dd', 'fontSize'),
    rowsFull: (() => { const vh = window.innerHeight; return Array.from(document.querySelectorAll('#ledger .row')).filter((el) => { const b = el.getBoundingClientRect(); return b.top >= 0 && b.bottom <= vh; }).length; })(),
  };
};

// C) A5 下首卡内部各部件是否都在视口内
const CARD = () => {
  const vh = window.innerHeight;
  const row = document.querySelector('#ledger .row');
  const b = row.getBoundingClientRect();
  const parts = ['.row-head h3', '.row-def', '.row-meta', '.row-family', '.swatches', '.shots .shot img', '.shot figcaption', '.row-foot'];
  const det = parts.map((s) => {
    const e = row.querySelector(s); if (!e) return { s, miss: true };
    const r = e.getBoundingClientRect();
    return { s, h: +r.height.toFixed(0), top: +r.top.toFixed(0), inView: r.top >= 0 && r.bottom <= vh, clipped: getComputedStyle(e).webkitLineClamp !== 'none' ? getComputedStyle(e).webkitLineClamp : null };
  });
  return { vh, rowTop: +b.top.toFixed(0), rowH: +b.height.toFixed(0), inView: b.top >= 0 && b.bottom <= vh, det };
};

const br = await Browser.launch({ width: 1440, height: 900 });
const out = {};
// A
out.cost = {};
for (const id of ['S01', 'S26', 'S29']) {
  const rec = {};
  let p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE + '#' + id, { settleMs: 2000 });
  await p.eval('document.fonts.ready.then(()=>1)');
  rec.closed = await p.eval(COST);
  rec.nLong = await p.eval(OPEN_LONG); await sleep(220);
  rec.openLong = await p.eval(COST);
  rec.nAll = await p.eval(OPEN_ALL); await sleep(280);
  rec.openAll = await p.eval(COST);
  await p.close(); out.cost[id] = rec;
}
// B
out.mast = {};
for (const [t, w, h, m] of [['1440', 1440, 900, false], ['390', 390, 844, true]]) {
  const rec = {};
  let p = await br.newPage({ width: w, height: h, dsf: 2, mobile: m });
  await p.goto(PAGE, { settleMs: 1800 });
  await p.eval('document.fonts.ready.then(()=>1)');
  rec.before = await p.eval(MAST);
  const p2 = await br.newPage({ width: w, height: h, dsf: 2, mobile: m });
  await p2.goto(PAGE, { settleMs: 1800 });
  await p2.eval('document.fonts.ready.then(()=>1)');
  await p2.eval(A5JS); await p2.eval('window.__A5()'); await sleep(350);
  rec.afterA5 = await p2.eval(MAST);
  rec.cardA5 = await p2.eval(CARD);
  await p2.screenshot({ path: join(HERE, `shot-${t}-a5-head.png`), format: 'png' });
  await p.screenshot({ path: join(HERE, `shot-${t}-head-base.png`), format: 'png' });
  await p.close(); await p2.close();
  out.mast[t] = rec;
}
await br.close();
writeFileSync(join(HERE, '_r10_final.json'), JSON.stringify(out, null, 1), 'utf8');

console.log('=== A 阅读成本（390，工作树=已折 4 长字段）===');
for (const k of Object.keys(out.cost)) {
  const c = out.cost[k];
  console.log(k, '闭合', c.closed.scrollH, '(' + c.closed.screens + ')', '| 开4长', c.openLong.scrollH, '(' + c.openLong.screens + ')', '| 全开', c.openAll.scrollH, '(' + c.openAll.screens + ')', '| n=' + c.nLong + '/' + c.nAll);
}
console.log('=== B 页头 ===');
for (const t of ['1440', '390']) {
  const m = out.mast[t];
  console.log(t, 'base h1', m.before.h1size, 'mastH', m.before.mastH, '(' + m.before.mastPct + '%)', 'cards', m.before.rowsFull);
  console.log(t, 'A5   h1', m.afterA5.h1size, 'mastH', m.afterA5.mastH, '(' + m.afterA5.mastPct + '%)', 'cards', m.afterA5.rowsFull, '| dd', m.afterA5.dd, 'kicker', m.afterA5.kicker);
  console.log(t, 'A5 首卡 inView=' + m.cardA5.inView, 'rowH=' + m.cardA5.rowH);
  m.cardA5.det.forEach((d) => console.log('     ', d.s, d.miss ? 'MISSING' : 'h=' + d.h + ' top=' + d.top + ' in=' + d.inView + (d.clipped ? ' clamp=' + d.clipped : '')));
}
