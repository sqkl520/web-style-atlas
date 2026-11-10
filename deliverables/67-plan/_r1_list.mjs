// _r1_list.mjs — 红队第 7 轮 · 前提 1 复算：390 列表页首屏到底给了用户什么
// 陷阱提醒：Browser.launch({width}) 只设 --window-size，必须 page.setViewport / newPage({mobile})
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const MEASURE = () => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; };
  const vh = window.innerHeight;
  const rows = Array.from(document.querySelectorAll('#ledger .row'));
  const firstRow = rows[0];
  const fr = r(firstRow);
  // 首屏内完整可见的行卡数 / 部分可见
  let full = 0, part = 0;
  rows.forEach((el) => { const b = el.getBoundingClientRect(); if (b.top >= 0 && b.bottom <= vh) full++; else if (b.top < vh && b.bottom > 0) part++; });
  // 首屏内可交互元素（芯片/输入/按钮/链接）及其完整可见数
  const inter = Array.from(document.querySelectorAll('a[href],button,input,select,summary')).filter((el) => {
    const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0;
  });
  let interFull = 0; const interVisibleSample = [];
  inter.forEach((el) => {
    const b = el.getBoundingClientRect();
    if (b.top >= 0 && b.bottom <= vh) { interFull++; if (interVisibleSample.length < 60) interVisibleSample.push({ tag: el.tagName, t: (el.textContent || el.placeholder || '').trim().slice(0, 18), top: +b.top.toFixed(0), h: +b.height.toFixed(0) }); }
  });
  const chips = Array.from(document.querySelectorAll('.rail .chips button'));
  let chipFull = 0; chips.forEach((el) => { const b = el.getBoundingClientRect(); if (b.top >= 0 && b.bottom <= vh) chipFull++; });
  // rail 可见窗口里露出多少（内滚）
  const rail = document.querySelector('.rail');
  const railBlockTops = Array.from(document.querySelectorAll('.rail-block h2')).map((h) => { const b = h.getBoundingClientRect(); return { t: h.textContent.trim(), top: +b.top.toFixed(0), inView: b.top >= 0 && b.bottom <= vh }; });
  // 首屏各块
  const mast = r(document.querySelector('.mast'));
  const mastParts = {};
  ['.mast-kicker', '.mast h1', '.mast-claim', '.mast-wizard', '.mast-exit', '.mast-facts'].forEach((s) => { mastParts[s] = r(document.querySelector(s)); });
  const claimChars = (document.querySelector('.mast-claim')?.textContent || '').trim().length;
  const exitChars = (document.querySelector('.mast-exit')?.textContent || '').trim().length;
  const bar = r(document.querySelector('.bar'));
  const barParts = {};
  ['.search', '.bar .count', '.bar .sort', '#reset', '#q-parked'].forEach((s) => { barParts[s] = r(document.querySelector(s)); });
  const qp = document.getElementById('q-parked');
  return {
    vh, dpr: window.devicePixelRatio, fonts: document.fonts.status,
    scrollH: document.documentElement.scrollHeight,
    scrollW: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    mast, mastParts, claimChars, exitChars, rail: r(rail), railScrollH: rail ? rail.scrollHeight : null,
    bar, barParts, parked: qp ? { exists: true, hidden: qp.hidden, display: getComputedStyle(qp).display, h: +qp.getBoundingClientRect().height.toFixed(1) } : { exists: false },
    firstRow: fr, rowCount: rows.length, rowsFull: full, rowsPart: part,
    interTotal: inter.length, interFull, chipsTotal: chips.length, chipFull,
    railBlocks: railBlockTops,
    mountH: r(document.querySelector('#ledger')),
  };
};

// A 方案五步（照抄 66-audit 的口径，但用当前 HEAD 的真实选择器）
const A5 = `
  function st(css){var s=document.createElement('style');s.setAttribute('data-lab','1');s.textContent=css;document.head.appendChild(s);}
  window.__A = function step(n){
    if(n>=1){ st('#q-parked[hidden]{display:none !important}'); }
    if(n>=2){
      var rail=document.querySelector('.rail');
      var d=document.createElement('details');d.setAttribute('data-lab','1');d.id='rt';
      var s=document.createElement('summary');s.textContent='筛选与场景反查 · 11 组';
      s.style.cssText='display:flex;align-items:center;font-size:14px;font-weight:600;padding:0 0 0 20px;min-height:48px;cursor:pointer;list-style-position:inside';
      var body=document.createElement('div'); while(rail.firstChild)body.appendChild(rail.firstChild);
      d.appendChild(s);d.appendChild(body);rail.appendChild(d);
      rail.style.maxHeight='none';rail.style.overflow='visible';rail.style.padding='0 16px 6px';rail.style.borderBottom='2px solid var(--ink)';
      d.open=false;
    }
    if(n>=3){
      var claim=document.querySelector('.mast-claim'), exit=document.querySelector('.mast-exit');
      var d2=document.createElement('details');d2.setAttribute('data-lab','1');d2.id='mh';
      var s2=document.createElement('summary');s2.textContent='这个图集是什么 · 想要现成模板去哪';
      s2.style.cssText='font-size:13px;color:var(--ink-2);padding:6px 0;cursor:pointer;line-height:1.6;min-height:24px';
      claim.parentNode.insertBefore(d2,claim); d2.appendChild(s2); d2.appendChild(claim); d2.appendChild(exit); d2.open=false;
    }
    if(n>=4){
      st('.bar{padding-bottom:8px;gap:6px 8px}.search{flex:1 1 100%}.search input{padding:6px 8px}'
        +'.bar .count{order:3;font-size:12px}.bar .sort{order:4;gap:4px}.bar .sort label{display:none}'
        +'.sort select{padding:6px 6px;font-size:13px}.btn-quiet{padding:6px 8px;font-size:13px;order:5}');
    }
    if(n>=5){
      st('.shots .shot img{max-height:100px}.shot{position:relative}'
        +'.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 4px;background:rgba(220,220,214,.92)}'
        +'.row-family{-webkit-line-clamp:1}.row{padding:9px 0;gap:14px}');
    }
    return true;
  };
`;

const M2 = () => {
  const vh = window.innerHeight;
  const rows = Array.from(document.querySelectorAll('#ledger .row'));
  const b = rows[0].getBoundingClientRect();
  let full = 0; rows.forEach((el) => { const x = el.getBoundingClientRect(); if (x.top >= 0 && x.bottom <= vh) full++; });
  const mast = document.querySelector('.mast').getBoundingClientRect();
  const rail = document.querySelector('.rail').getBoundingClientRect();
  const bar = document.querySelector('.bar').getBoundingClientRect();
  return { vh, mastH: +mast.height.toFixed(1), railH: +rail.height.toFixed(1), barH: +bar.height.toFixed(1), firstTop: +b.top.toFixed(1), firstH: +b.height.toFixed(1), rowsFull: full, margin: +(vh - b.top - b.height).toFixed(1) };
};

const out = { at: new Date().toISOString(), head: null, tiers: {} };
const br = await Browser.launch({ width: 1440, height: 900 });
for (const vp of [{ n: '390', w: 390, h: 844, m: true }, { n: '414', w: 414, h: 896, m: true }, { n: '1440', w: 1440, h: 900, m: false }]) {
  const p = await br.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1800 });
  await p.eval('document.fonts.ready.then(()=>1)');
  const base = await p.eval(MEASURE);
  // 逐步叠加 A1..A5，每步重新载入
  const steps = {};
  for (let n = 1; n <= 5; n++) {
    const p2 = await br.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
    await p2.goto(PAGE, { settleMs: 1500 });
    await p2.eval('document.fonts.ready.then(()=>1)');
    await p2.eval(A5);
    await p2.eval(`window.__A(${n})`);
    await sleep(260);
    steps['A' + n] = await p2.eval(M2);
    await p2.close();
  }
  out.tiers[vp.n] = { base, steps };
  await p.close();
}
// HEAD 信息（顺便记录被审版本）
out.head = process.env.HEAD || null;
await br.close();
writeFileSync(join(HERE, '_r1_list.json'), JSON.stringify(out, null, 1), 'utf8');
console.log(JSON.stringify(out, null, 1));
