// _r18_head.mjs — 在**冻结的 HEAD 副本**上重跑两条关键判据，排除工作树漂移
// 校验点：详情 S01 应回到 3538（HEAD 值）；列表首卡应回到 954
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HEADPAGE = 'file:///' + join(HERE, '_head', 'index.html').replace(/\\/g, '/');

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
  window.__A5 = function(){ addStyle('#q-parked[hidden]{display:none !important}'); railToSummary(); headFold(); barTight(); addStyle(ROWFIX); return 1; };
`;

const BASELINE = () => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { t: +b.top.toFixed(1), h: +b.height.toFixed(1) }; };
  const rows = document.querySelectorAll('#ledger .row');
  const f = rows[0].getBoundingClientRect();
  return { vh: window.innerHeight, mast: r('.mast'), rail: r('.rail'), bar: r('.bar'), firstTop: +f.top.toFixed(1), firstH: +f.height.toFixed(1), rows: rows.length };
};

const CARDS = () => {
  const vh = window.innerHeight;
  const rows = Array.from(document.querySelectorAll('#ledger .row'));
  const hs = rows.map((r) => { const b = r.getBoundingClientRect(); return { t: +b.top.toFixed(0), h: +b.height.toFixed(0), bot: +b.bottom.toFixed(0) }; });
  const firstRow = rows[0];
  const label = (firstRow.querySelector('.no')?.textContent || '').trim() + ' ' + (firstRow.querySelector('h3')?.textContent || '').trim().slice(0, 12);
  return {
    vh, firstLabel: label,
    firstTop: hs[0].t, firstH: hs[0].h, margin: +(vh - hs[0].bot).toFixed(1),
    full: hs.filter((x) => x.t >= 0 && x.bot <= vh).length,
    minH: Math.min(...hs.map((x) => x.h)), maxH: Math.max(...hs.map((x) => x.h)),
  };
};
const SORT = (v) => { const s = document.getElementById('sort'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); return document.getElementById('sort').value; };

const DETAIL = () => {
  const d = document.getElementById('detail');
  return { scrollH: d.scrollHeight, screens: +(d.scrollHeight / d.clientHeight).toFixed(2), fields: d.querySelectorAll('.fields .field').length, details: d.querySelectorAll('#d-body details').length };
};

const br = await Browser.launch({ width: 1440, height: 900 });
const out = { page: HEADPAGE };

// 1) 基线校验：应复现 954 / 3538
{
  const p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(HEADPAGE, { settleMs: 1900 });
  await p.eval('document.fonts.ready.then(()=>1)');
  out.base = await p.eval(BASELINE);
  await p.close();
}
// 2) HEAD 详情基线
{
  const p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(HEADPAGE + '#S01', { settleMs: 2100 });
  await p.eval('document.fonts.ready.then(()=>1)');
  out.detailS01 = await p.eval(DETAIL);
  await p.close();
}
// 3) A5 + 三种排序
out.cards = {};
for (const [k, v] of [['默认(方案号)', 'n'], ['闸门FAIL多在前', 'gate'], ['未建的在前', 'built'], ['认知门槛', 'thr']]) {
  const p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(HEADPAGE, { settleMs: 1700 });
  await p.eval('document.fonts.ready.then(()=>1)');
  await p.eval(A5JS); await p.eval('window.__A5()');
  const got = await p.eval(SORT, v); await sleep(420);
  out.cards[k] = { ...(await p.eval(CARDS)), sortApplied: got };
  await p.close();
}
// 4) 不折任何东西、只换排序：现状下首屏卡数
out.cardsNoA5 = {};
for (const [k, v] of [['默认(方案号)', 'n'], ['闸门FAIL多在前', 'gate']]) {
  const p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(HEADPAGE, { settleMs: 1700 });
  await p.eval('document.fonts.ready.then(()=>1)');
  await p.eval(SORT, v); await sleep(380);
  out.cardsNoA5[k] = await p.eval(CARDS);
  await p.close();
}
await br.close();
writeFileSync(join(HERE, '_r18_head.json'), JSON.stringify(out, null, 1), 'utf8');

console.log('HEAD 基线校验：', JSON.stringify(out.base));
console.log('HEAD 详情 S01：', JSON.stringify(out.detailS01), '  ← 应为 3538 / 4.19');
console.log('--- A5 之后，换排序 ---');
for (const k of Object.keys(out.cards)) {
  const c = out.cards[k];
  console.log(k.padEnd(14), '首卡', c.firstLabel, '| top=' + c.firstTop, 'h=' + c.firstH, '余量=' + c.margin, '完整卡=' + c.full, '| 卡高 ' + c.minH + '–' + c.maxH, '| sort=' + c.sortApplied);
}
console.log('--- 不动任何东西，只换排序 ---');
for (const k of Object.keys(out.cardsNoA5)) {
  const c = out.cardsNoA5[k];
  console.log(k.padEnd(14), '首卡', c.firstLabel, '| top=' + c.firstTop, 'h=' + c.firstH, '完整卡=' + c.full);
}
