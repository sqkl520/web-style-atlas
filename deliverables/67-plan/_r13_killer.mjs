// _r13_killer.mjs — 两个决定性实验
// A) 「1 张完整卡」在换了排序之后还成立吗（余量只有 2.3px，而卡高随 WARN 行数变）
// B) 字段定位能不能做到 **0px**（复用已存在的 .detail-no 那一行，而不是新增一行）
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

const CARDS = () => {
  const vh = window.innerHeight;
  const rows = Array.from(document.querySelectorAll('#ledger .row'));
  const hs = rows.map((r) => { const b = r.getBoundingClientRect(); return { t: +b.top.toFixed(0), h: +b.height.toFixed(0), bot: +b.bottom.toFixed(0) }; });
  const first = hs[0];
  const full = hs.filter((x) => x.t >= 0 && x.bot <= vh).length;
  // 换排序后「第一张」会是谁 —— 用高度最大的那张模拟最坏情况
  const maxH = Math.max(...hs.map((x) => x.h));
  return {
    vh, firstTop: first.t, firstH: first.h, margin: +(vh - first.bot).toFixed(1), full,
    heights: hs.slice(0, 8), maxH, minH: Math.min(...hs.map((x) => x.h)),
    // 最坏情况：如果首卡是最高那张，还能完整放下吗
    worstMargin: +(vh - first.t - maxH).toFixed(1),
  };
};
const SORT = (v) => { const s = document.getElementById('sort'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); return 1; };

// B) 0px 定位：复用 .detail-no（本来就存在、本来就是 S01）那一行
const WF0 = () => {
  const d = document.getElementById('detail');
  const no = d.querySelector('.detail-no'); no.style.whiteSpace='nowrap'; no.style.overflow='hidden'; no.style.textOverflow='ellipsis';
  const fields = Array.from(d.querySelectorAll('.fields .field'));
  const total = fields.length;
  const base = no.textContent;
  const upd = () => {
    const head = d.querySelector('.detail-head').getBoundingClientRect();
    let cur = null, idx = 0;
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].getBoundingClientRect().bottom > head.bottom + 2) { cur = fields[i]; idx = i + 1; break; }
    }
    const name = cur ? (cur.querySelector('dt')?.textContent.trim() || cur.querySelector('summary')?.textContent.trim() || '').slice(0, 4) : '';
    no.textContent = cur ? base + ' ' + idx + '/' + total + ' ' + name : base;
  };
  d.addEventListener('scroll', upd, { passive: true });
  upd();
  return total;
};
const HEADH = () => {
  const d = document.getElementById('detail');
  return { headH: +d.querySelector('.detail-head').getBoundingClientRect().height.toFixed(1), noText: d.querySelector('.detail-no').textContent, scrollH: d.scrollHeight };
};
const SCROLLTO = (y) => { const d = document.getElementById('detail'); d.scrollTop = y; return d.querySelector('.detail-no').textContent; };

const br = await Browser.launch({ width: 1440, height: 900 });
const out = {};
// A
out.cards = {};
for (const [k, v] of [['默认(方案号)', 'n'], ['闸门FAIL多在前', 'gate'], ['未建的在前', 'built']]) {
  const p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE, { settleMs: 1700 });
  await p.eval('document.fonts.ready.then(()=>1)');
  await p.eval(A5JS); await p.eval('window.__A5()');
  await p.eval(SORT, v); await sleep(400);
  out.cards[k] = await p.eval(CARDS);
  await p.close();
}
// B
out.wf0 = {};
for (const id of ['S01', 'S26']) {
  const rec = {};
  let p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE + '#' + id, { settleMs: 2100 });
  await p.eval('document.fonts.ready.then(()=>1)');
  rec.before = await p.eval(HEADH);
  await p.eval(WF0); await sleep(150);
  rec.after = await p.eval(HEADH);
  rec.at = [];
  for (const y of [0, 700, 1400, 2100]) rec.at.push({ y, no: await p.eval(SCROLLTO, y) });
  await p.close();
  out.wf0[id] = rec;
}
await br.close();
writeFileSync(join(HERE, '_r13_killer.json'), JSON.stringify(out, null, 1), 'utf8');

console.log('=== A) A5 之后「首屏 1 张完整卡」稳不稳 ===');
for (const k of Object.keys(out.cards)) {
  const c = out.cards[k];
  console.log(k.padEnd(16), '首卡 top=' + c.firstTop, 'h=' + c.firstH, '余量=' + c.margin, '完整卡=' + c.full,
    '| 30 案卡高 ' + c.minH + '–' + c.maxH, '| 若首卡是最高的那张，余量=' + c.worstMargin);
}
console.log('   前 8 张卡高：', out.cards['默认(方案号)'].heights.map((x) => x.h).join(' / '));
console.log('=== B) 0px 字段定位（复用 .detail-no 行）===');
for (const k of Object.keys(out.wf0)) {
  const r = out.wf0[k];
  console.log(k, 'headH', r.before.headH, '->', r.after.headH, 'Δ=' + (r.after.headH - r.before.headH).toFixed(1),
    '| scrollH', r.before.scrollH, '->', r.after.scrollH, 'Δ=' + (r.after.scrollH - r.before.scrollH));
  r.at.forEach((x) => console.log('     y=' + x.y, '→', x.no));
}
