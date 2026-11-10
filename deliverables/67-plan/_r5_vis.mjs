// _r5_vis.mjs — 校正「首屏到底能看见什么」：闭 <details> 里的元素几何必须排除
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
    var body=document.createElement('div');
    while(rail.firstChild)body.appendChild(rail.firstChild);
    d.appendChild(s);d.appendChild(body);rail.appendChild(d);
    rail.style.maxHeight='none';rail.style.overflow='visible';
    rail.style.padding='0 16px 6px';rail.style.borderBottom='2px solid var(--ink)';
    d.open=false;
  }
  function headFold(){
    var claim=document.querySelector('.mast-claim');
    var exit=document.querySelector('.mast-exit');
    var d=document.createElement('details');d.setAttribute('data-lab','1');
    var s=document.createElement('summary');s.textContent='这个图集是什么 · 想要现成模板去哪';
    s.style.cssText='font-size:13px;color:var(--ink-2);padding:6px 0;cursor:pointer;line-height:1.6;min-height:24px';
    claim.parentNode.insertBefore(d,claim);
    d.appendChild(s);d.appendChild(claim);d.appendChild(exit);
    d.open=false;
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
  window.__A5 = function(){
    addStyle('#q-parked[hidden]{display:none !important}');
    railToSummary(); headFold(); barTight(); addStyle(ROWFIX); return 1;
  };
  window.__RAIL = function(){
    var rail=document.querySelector('.rail');
    var d=document.createElement('details');d.setAttribute('data-lab','1');
    var s=document.createElement('summary');s.textContent='筛选与场景反查 · 11 组 47 颗芯片';
    s.style.cssText='display:flex;align-items:center;font-size:14px;font-weight:600;padding:0 0 0 20px;min-height:48px;cursor:pointer;list-style-position:inside';
    var body=document.createElement('div'); while(rail.firstChild)body.appendChild(rail.firstChild);
    d.appendChild(s);d.appendChild(body);rail.appendChild(d);
    rail.style.maxHeight='none';rail.style.overflow='visible';
    rail.style.padding='0 16px 6px';rail.style.borderBottom='2px solid var(--ink)'; d.open=false; return 1;
  };
`;

// 严格可见：元素自身渲染且有面积，且**不在关闭的 details 里**，且在视口内
const STRICT = () => {
  const vh = window.innerHeight;
  const inClosedDetails = (el) => {
    let n = el;
    while (n && n !== document.body) {
      if (n.tagName === 'DETAILS' && !n.open) return true;
      n = n.parentElement;
    }
    return false;
  };
  const shown = (el) => {
    if (inClosedDetails(el)) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    if (el.closest('.mast-claim, .mast-exit') && inClosedDetails(el)) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const visBox = (el) => { if (!shown(el)) return false; const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= vh; };

  const rows = Array.from(document.querySelectorAll('#ledger .row'));
  const firstRow = rows[0].getBoundingClientRect();
  const rowsFull = rows.filter(visBox).length;

  const inter = Array.from(document.querySelectorAll('a[href],button,input,select,summary')).filter(shown);
  const interFull = inter.filter(visBox);
  const chipFull = interFull.filter((el) => el.closest('.chips')).length;

  // 首屏可见文字，只算「页面 chrome」区（页头/筛选/工具条），不含行卡
  let chromeText = 0; const byBlock = {};
  ['.mast-kicker', '.mast h1', '.mast-claim', '.mast-wizard', '.mast-exit', '.mast-facts',
    '.rail-lead', '.rail-hint', '.rail-sep', '.rail h2', '.bar label', '.bar .count', '#reset', 'summary'].forEach((s) => {
    document.querySelectorAll(s).forEach((el) => {
      if (!visBox(el)) return;
      const t = (el.textContent || '').replace(/\s+/g, '');
      if (!t) return;
      chromeText += t.length;
      byBlock[s] = (byBlock[s] || 0) + t.length;
    });
  });
  const railBlocksVis = Array.from(document.querySelectorAll('.rail-block h2')).filter(visBox).length;
  const seen = {
    claim: visBox(document.querySelector('.mast-claim')),
    exit: visBox(document.querySelector('.mast-exit')),
    facts: visBox(document.querySelector('.mast-facts')),
    wiz: visBox(document.querySelector('.mast-wizard')),
    search: visBox(document.querySelector('#q')),
    sort: visBox(document.querySelector('#sort')),
    reset: visBox(document.querySelector('#reset')),
    count: visBox(document.querySelector('#count')),
  };
  const chipText = Array.from(document.querySelectorAll('.rail .chips button')).filter(visBox).map((b) => b.textContent.trim().replace(/\s+/g, '')).join('|');
  return {
    vh, scrollH: document.documentElement.scrollHeight,
    firstTop: +firstRow.top.toFixed(1), firstH: +firstRow.height.toFixed(1),
    margin: +(vh - firstRow.bottom).toFixed(1), rowsFull,
    interShown: inter.length, interFull: interFull.length, chipFull,
    chromeText, byBlock, railBlocksVis, seen,
    chipLabels: chipText.slice(0, 400),
    img: (() => { const i = document.querySelector('#ledger .row .shot img'); if (!i) return null; const r = i.getBoundingClientRect(); return { w: +r.width.toFixed(0), h: +r.height.toFixed(0) }; })(),
  };
};

async function run(br, js, fn) {
  const p = await br.newPage({ width: 390, height: 844, dsf: 3, mobile: true });
  await p.goto(PAGE, { settleMs: 1700 });
  await p.eval('document.fonts.ready.then(()=>1)');
  if (js) { await p.eval(js); await p.eval(`window.${fn}()`); await sleep(340); }
  const m = await p.eval(STRICT);
  await p.close();
  return m;
}

const br = await Browser.launch({ width: 1440, height: 900 });
const out = {};
out.base = await run(br, null, null);
out.railFoldOnly = await run(br, A5JS, '__RAIL');
out.a5 = await run(br, A5JS, '__A5');
await br.close();
writeFileSync(join(HERE, '_r5_vis.json'), JSON.stringify(out, null, 1), 'utf8');
for (const k of ['base', 'railFoldOnly', 'a5']) {
  const m = out[k];
  console.log('===', k, '===');
  console.log('  firstTop', m.firstTop, 'cardH', m.firstH, 'margin', m.margin, 'rowsFull', m.rowsFull);
  console.log('  interShown', m.interShown, 'interFull', m.interFull, 'chipFull', m.chipFull, 'railBlocksVis', m.railBlocksVis);
  console.log('  chromeText', m.chromeText, JSON.stringify(m.byBlock));
  console.log('  seen', JSON.stringify(m.seen), 'img', JSON.stringify(m.img));
}
