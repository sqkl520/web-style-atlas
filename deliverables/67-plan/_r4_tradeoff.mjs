// _r4_tradeoff.mjs — 「这笔交易划不划算」的量化：首屏还能知道什么、还能做什么、失去了什么
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

// A5 逐字（66-audit/m32 的 LH 串）
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
`;

// 只做「代价最小的那一步」候选，逐个单独测
const SINGLE = {
  // 只折 rail（A2）
  railOnly: `(function(){ var rail=document.querySelector('.rail');
    var d=document.createElement('details');d.setAttribute('data-lab','1');
    var s=document.createElement('summary');s.textContent='筛选与场景反查 · 11 组 47 颗芯片';
    s.style.cssText='display:flex;align-items:center;font-size:14px;font-weight:600;padding:0 0 0 20px;min-height:48px;cursor:pointer;list-style-position:inside';
    var body=document.createElement('div'); while(rail.firstChild)body.appendChild(rail.firstChild);
    d.appendChild(s);d.appendChild(body);rail.appendChild(d);
    rail.style.maxHeight='none';rail.style.overflow='visible';
    rail.style.padding='0 16px 6px';rail.style.borderBottom='2px solid var(--ink)'; d.open=false; return 1; })()`,
  // 只把页头 facts 折/移（不动散文）
  factsOnly: `(function(){ var f=document.querySelector('.mast-facts'); f.style.display='none'; return 1; })()`,
  // 只把 claim+exit 折起（A3 的折叠部分），不动任何字号
  headFoldPlain: `(function(){ var claim=document.querySelector('.mast-claim'), exit=document.querySelector('.mast-exit');
    var d=document.createElement('details');d.setAttribute('data-lab','1');
    var s=document.createElement('summary');s.textContent='这个图集是什么 · 想要现成模板去哪';
    s.style.cssText='font-size:13px;color:var(--ink-2);padding:6px 0;cursor:pointer;line-height:1.6;min-height:24px';
    claim.parentNode.insertBefore(d,claim); d.appendChild(s); d.appendChild(claim); d.appendChild(exit); d.open=false; return 1; })()`,
  // 工具条两行（A4），不动字号
  barRows: `(function(){ var s=document.createElement('style');s.setAttribute('data-lab','1');
    s.textContent='.bar{padding-bottom:8px;gap:6px 8px}.search{flex:1 1 100%}.bar .count{order:3}.bar .sort{order:4;gap:4px}.btn-quiet{order:5}';
    document.head.appendChild(s); return 1; })()`,
};

const PROBE = () => {
  const vh = window.innerHeight;
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= vh; };
  const rows = Array.from(document.querySelectorAll('#ledger .row'));
  const fullRows = rows.filter(vis).length;
  const b0 = rows[0].getBoundingClientRect();
  // 首屏内**完整可见**的可交互元素，按语义分类
  const inter = Array.from(document.querySelectorAll('a[href],button,input,select,summary'))
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const interFull = inter.filter((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= vh; });
  const chipsFull = interFull.filter((el) => el.closest('.chips')).length;
  // 首屏里**完整可见**的正文文字量（汉字+字母数字）
  let textInView = 0; const textByBlock = {};
  document.querySelectorAll('.mast p, .mast h1, .bar p, .bar label, .rail h2, .row').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= vh) {
      const t = (el.textContent || '').replace(/\s+/g, '');
      textInView += t.length;
      const k = el.className || el.tagName;
      textByBlock[k] = (textByBlock[k] || 0) + t.length;
    }
  });
  // 首屏是否还能看到：向导入口 / 模板出口 / 数字表 / 筛选组数 / 排序
  const seen = {
    wizard: vis(document.querySelector('.mast-wizard')),
    exit: vis(document.querySelector('.mast-exit')),
    facts: vis(document.querySelector('.mast-facts')),
    claim: vis(document.querySelector('.mast-claim')),
    search: vis(document.querySelector('#q')),
    sort: vis(document.querySelector('#sort')),
    reset: vis(document.querySelector('#reset')),
    count: vis(document.querySelector('#count')),
    tplStrip: document.querySelector('#tpl-strip') && !document.querySelector('#tpl-strip').hidden,
  };
  const railBlocks = Array.from(document.querySelectorAll('.rail-block h2')).filter(vis).length;
  // 首卡里被看到的图有多大（px）
  const img = document.querySelector('#ledger .row .shot img');
  const ir = img ? img.getBoundingClientRect() : null;
  return {
    vh, scrollH: document.documentElement.scrollHeight,
    firstTop: +b0.top.toFixed(1), firstH: +b0.height.toFixed(1), fullRows,
    margin: +(vh - b0.bottom).toFixed(1),
    interTotal: inter.length, interFull: interFull.length, chipsFull,
    textInView, textByBlock, seen, railBlocks,
    imgW: ir ? +ir.width.toFixed(0) : null, imgH: ir ? +ir.height.toFixed(0) : null,
  };
};

async function shot(br, tag, js) {
  const p = await br.newPage({ width: 390, height: 844, dsf: 3, mobile: true });
  await p.goto(PAGE, { settleMs: 1700 });
  await p.eval('document.fonts.ready.then(()=>1)');
  if (js) { await p.eval(js); await sleep(320); }
  const m = await p.eval(PROBE);
  await p.screenshot({ path: join(HERE, `shot-390-${tag}.png`), format: 'png' });
  await p.close();
  return m;
}

const out = {};
const br = await Browser.launch({ width: 1440, height: 900 });
out.base = await shot(br, 'base', null);
for (const k of Object.keys(SINGLE)) out[k] = await shot(br, k, SINGLE[k]);
// A5 需要连跑
{
  const p = await br.newPage({ width: 390, height: 844, dsf: 3, mobile: true });
  await p.goto(PAGE, { settleMs: 1700 });
  await p.eval('document.fonts.ready.then(()=>1)');
  await p.eval(A5JS); await p.eval('window.__A5()'); await sleep(350);
  out.a5 = await p.eval(PROBE);
  await p.screenshot({ path: join(HERE, 'shot-390-a5.png'), format: 'png' });
  await p.close();
}
await br.close();
writeFileSync(join(HERE, '_r4_tradeoff.json'), JSON.stringify(out, null, 1), 'utf8');
const keys = ['base', ...Object.keys(SINGLE), 'a5'];
for (const k of keys) {
  const m = out[k];
  console.log(k.padEnd(14), `firstTop=${m.firstTop}`.padEnd(18), `cardH=${m.firstH}`.padEnd(14), `full=${m.fullRows}`,
    `interFull=${m.interFull}`.padEnd(16), `text=${m.textInView}`.padEnd(12),
    'seen:' + Object.entries(m.seen).filter(([, v]) => v).map(([a]) => a).join(','),
    '| img=' + m.imgW + 'x' + m.imgH);
}
