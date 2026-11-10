// _p1_list.mjs — 独立复算列表页 390/414/1440，且把 A5 叠在**当前 HEAD**上重跑
// 关键：Browser.launch({width}) 只影响 --window-size，必须显式 setViewport（cdp.mjs:41-57 vs :142-146）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

// ── A5 的五步，逐字照抄审计 m32-definitive.mjs 的 LH 串（好让数字可比），只额外标注 ──
const LH = `
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
`;

const LM = () => {
  const rows = Array.from(document.querySelectorAll('#ledger .row'));
  const vh = window.innerHeight;
  const infos = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  const first = infos[0];
  const vis = Math.max(0, Math.min(first.bottom, vh) - Math.max(first.top, 0));
  const g = (s) => { const e = document.querySelector(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  const qp = document.getElementById('q-parked');
  // 页头逐块
  const parts = {};
  for (const sel of ['.mast-kicker', 'h1', '.mast-claim', '.mast-wizard', '.mast-exit', '.mast-facts']) {
    const e = document.querySelector('.mast ' + sel);
    if (e) parts[sel] = +e.getBoundingClientRect().height.toFixed(1);
  }
  // 首卡逐块
  const r0 = rows[0] ? rows[0] : null;
  const card = {};
  if (r0) for (const sel of ['.no', '.row-head', '.row-def', '.row-meta', '.row-family', '.swatches', '.shots', '.row-foot']) {
    const e = r0.querySelector(sel);
    if (e) card[sel] = +e.getBoundingClientRect().height.toFixed(1);
  }
  const rail = document.querySelector('.rail');
  return {
    vh, mastH: g('.mast'), railH: g('.rail'), barH: g('.bar'),
    railInnerScrollH: rail ? rail.scrollHeight : null,
    qparkedExists: !!qp, qparkedH: qp ? +qp.getBoundingClientRect().height.toFixed(1) : null,
    qparkedDisplay: qp ? getComputedStyle(qp).display : null,
    firstRowTop: first ? first.top : null, firstRowH: first ? first.h : null,
    firstRowBottom: first ? first.bottom : null,
    firstVisiblePct: first ? +(vis / first.h * 100).toFixed(1) : null,
    complete: infos.filter((x) => x.top >= 0 && x.bottom <= vh).length,
    partial: infos.filter((x) => x.top < vh && x.bottom > vh).length,
    rowCount: infos.length,
    docH: document.documentElement.scrollHeight,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    mastParts: parts, firstCardParts: card,
    cssVarS15: getComputedStyle(document.documentElement).getPropertyValue('--s-15').trim(),
    claimFontSize: (() => { const e = document.querySelector('.mast-claim'); return e ? getComputedStyle(e).fontSize : null; })(),
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '414', w: 414, h: 896, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  // 反证：launch width 不生效 —— 只设 window-size 不设 viewport 时 innerWidth 是多少
  if (vp.k === '390') {
    const probe = await Browser.launch({ width: 390, height: 844 });
    const p2 = await probe.newPage({ width: 1440, height: 900 }); // 故意给 1440
    await p2.goto(PAGE, { settleMs: 800 });
    const a = await p2.eval(() => ({ iw: innerWidth, ih: innerHeight }));
    await p2.setViewport({ width: 390, height: 844, mobile: true });
    const b = await p2.eval(() => ({ iw: innerWidth, ih: innerHeight }));
    await probe.close();
    out.viewportProof = { setViewportTo1440: a, thenTo390: b };
  }
  out[vp.k] = {};
  for (const [k, code] of Object.entries({
    'A0 现状(HEAD)': '',
    'A1 只修q-parked': 'fixParked();',
    'A2 A1+rail折': 'fixParked();railToSummary();',
    'A3 A2+页头折': 'fixParked();railToSummary();headFold();',
    'A4 A3+工具条': 'fixParked();railToSummary();headFold();barTight();',
    'A5 A4+行卡收紧': 'fixParked();railToSummary();headFold();barTight();addStyle(ROWFIX);',
  })) {
    await p.goto(PAGE, { settleMs: 1400 });
    if (code) { await p.eval((x) => { new Function(x)(); }, LH + code); await new Promise((r) => setTimeout(r, 300)); }
    out[vp.k][k] = await p.eval(LM);
    const m = out[vp.k][k];
    console.log(`[${vp.k}] ${k.padEnd(20)} mast=${String(m.mastH).padStart(6)} rail=${String(m.railH).padStart(6)} bar=${String(m.barH).padStart(6)} 首卡=${String(m.firstRowTop).padStart(7)} h=${String(m.firstRowH).padStart(6)} 完整=${m.complete} 部分=${m.partial} 可见=${m.firstVisiblePct}% ovX=${m.overflowX} qp=${m.qparkedH}`);
  }
  await p.close();
}
writeFileSync(join(HERE, '_p1_list.json'), JSON.stringify(out, null, 1));
console.log('\nHEAD 390 mastParts:', JSON.stringify(out['390']['A0 现状(HEAD)'].mastParts));
console.log('HEAD 390 card:', JSON.stringify(out['390']['A0 现状(HEAD)'].firstCardParts));
console.log('viewportProof:', JSON.stringify(out.viewportProof));
await browser.close();
