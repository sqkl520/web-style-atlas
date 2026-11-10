// _r2_a5.mjs — 用 66-audit 的**逐字** LH 串复现 A5，与「只折不重排」对照
// 目的：把 A5 的 1.4px 余量拆成「折叠（内容仍在）」与「重排（字号变小）」两笔账
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

// ── 66-audit/m32-definitive.mjs 的 LH 串（逐字照抄，含页头重排 CSS）──
const AUDIT = `
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
  function fixParked(){addStyle('#q-parked[hidden]{display:none !important}');}
  var ROWFIX='.shots .shot img{max-height:100px}.shot{position:relative}'
    +'.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 4px;background:rgba(220,220,214,.92)}'
    +'.row-family{-webkit-line-clamp:1}.row{padding:9px 0;gap:14px}';
  window.__AUDIT = function(n){
    if(n>=1) fixParked();
    if(n>=2) railToSummary();
    if(n>=3) headFold();
    if(n>=4) barTight();
    if(n>=5) addStyle(ROWFIX);
    return true;
  };
`;

// 「只折不重排」版：折叠三块（rail / 页头两段散文 / 工具条两行）+ 行卡收紧，但**一个字号的 CSS 都不改**
const MINIMAL = `
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
  }
  function barTight(){
    addStyle('.bar{padding-bottom:8px;gap:6px 8px}.search{flex:1 1 100%}'
      +'.bar .count{order:3}.bar .sort{order:4;gap:4px}'
      +'.btn-quiet{order:5}');
  }
  window.__MIN = function(n){
    if(n>=1) railToSummary();
    if(n>=2) headFold();
    if(n>=3) barTight();
    return true;
  };
`;

const M = () => {
  const vh = window.innerHeight;
  const rows = Array.from(document.querySelectorAll('#ledger .row'));
  const b = rows[0].getBoundingClientRect();
  let full = 0; rows.forEach((el) => { const x = el.getBoundingClientRect(); if (x.top >= 0 && x.bottom <= vh) full++; });
  const mast = document.querySelector('.mast').getBoundingClientRect();
  const rail = document.querySelector('.rail').getBoundingClientRect();
  const bar = document.querySelector('.bar').getBoundingClientRect();
  const cs = (s, p) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[p] : null; };
  return {
    vh,
    mastH: +mast.height.toFixed(1), railH: +rail.height.toFixed(1), barH: +bar.height.toFixed(1),
    firstTop: +b.top.toFixed(1), firstH: +b.height.toFixed(1),
    rowsFull: full, margin: +(vh - b.top - b.height).toFixed(1),
    // 页头字号：证明"重排"到底改了哪些字号
    h1: cs('.mast h1', 'fontSize'), kicker: cs('.mast-kicker', 'fontSize'),
    claim: cs('.mast-claim', 'fontSize'), dd: cs('.mast-facts dd', 'fontSize'),
    dt: cs('.mast-facts dt', 'fontSize'),
    wizA: cs('.mast-wizard a', 'fontSize'), exitS: cs('.mast-exit', 'fontSize'),
    // 折叠后首屏还剩多少可交互元素
    interFull: Array.from(document.querySelectorAll('a[href],button,input,select,summary')).filter((el) => { const r = el.getBoundingClientRect(); return r.height > 0 && r.top >= 0 && r.bottom <= vh; }).length,
    chipFull: Array.from(document.querySelectorAll('.rail .chips button')).filter((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= vh; }).length,
  };
};

const out = { at: new Date().toISOString(), variants: {} };
const br = await Browser.launch({ width: 1440, height: 900 });
async function run(tier, mk, js, fn, n) {
  const p = await br.newPage({ width: tier.w, height: tier.h, dsf: 2, mobile: tier.m });
  await p.goto(PAGE, { settleMs: 1500 });
  await p.eval('document.fonts.ready.then(()=>1)');
  if (mk) { await p.eval(js); await p.eval(`window.${fn}(${n})`); }
  await sleep(300);
  const r = await p.eval(M);
  await p.close();
  return r;
}
const t390 = { w: 390, h: 844, m: true }, t414 = { w: 414, h: 896, m: true }, t1440 = { w: 1440, h: 900, m: false };
for (const [nn, tier] of [['390', t390], ['414', t414], ['1440', t1440]]) {
  const v = {};
  v.base = await run(tier, false);
  for (let n = 1; n <= 5; n++) v['audit_A' + n] = await run(tier, true, AUDIT, '__AUDIT', n);
  for (let n = 1; n <= 3; n++) v['min_M' + n] = await run(tier, true, MINIMAL, '__MIN', n);
  out.variants[nn] = v;
}
await br.close();
writeFileSync(join(HERE, '_r2_a5.json'), JSON.stringify(out, null, 1), 'utf8');
for (const k of Object.keys(out.variants)) {
  const v = out.variants[k];
  console.log('=== ' + k + ' ===');
  for (const kk of Object.keys(v)) {
    const x = v[kk];
    console.log(kk.padEnd(10), `mast=${x.mastH} rail=${x.railH} bar=${x.barH} firstTop=${x.firstTop} cardH=${x.firstH} full=${x.rowsFull} margin=${x.margin} interFull=${x.interFull} chipFull=${x.chipFull}`);
  }
  const b = v.base;
  console.log('  fonts base: h1=' + b.h1 + ' kicker=' + b.kicker + ' claim=' + b.claim + ' dd=' + b.dd + ' dt=' + b.dt + ' wizA=' + b.wizA);
  const a5 = v.audit_A5;
  console.log('  fonts A5  : h1=' + a5.h1 + ' kicker=' + a5.kicker + ' claim=' + a5.claim + ' dd=' + a5.dd + ' dt=' + a5.dt + ' wizA=' + a5.wizA);
}
