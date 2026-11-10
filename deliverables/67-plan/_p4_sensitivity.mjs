// _p4_sensitivity.mjs — 核心攻击：844 是「屏幕高」不是「可视高」。
// headless Chrome 没有地址栏，真 iPhone Safari 的可视视口只有 ~690–750px。
// 如果 A5 的 1 张完整卡只在 844 成立，那它对真实用户是 0。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

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
    rail.style.padding='0 16px 6px';rail.style.borderBottom='2px solid var(--ink)';d.open=false;
  }
  function headFold(){
    var claim=document.querySelector('.mast-claim'),exit=document.querySelector('.mast-exit');
    var d=document.createElement('details');d.setAttribute('data-lab','1');
    var s=document.createElement('summary');s.textContent='这个图集是什么 · 想要现成模板去哪';
    s.style.cssText='font-size:13px;color:var(--ink-2);padding:6px 0;cursor:pointer;line-height:1.6;min-height:24px';
    claim.parentNode.insertBefore(d,claim);d.appendChild(s);d.appendChild(claim);d.appendChild(exit);d.open=false;
    addStyle('.mast{padding:12px 16px 10px;gap:8px}.mast-kicker{font-size:12px;margin-bottom:4px}'
      +'.mast h1{font-size:26px;line-height:1.1}.mast-wizard{margin-top:6px}.mast-wizard a{padding:6px 10px;font-size:14px}'
      +'.mast-facts{display:flex;margin-top:6px;gap:0}.mast-facts>div{flex:1 1 0;border-top:1px solid var(--ink);padding-top:3px}'
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
  function A5(){railToSummary();headFold();barTight();addStyle(ROWFIX);}
  function A4(){railToSummary();headFold();barTight();}
`;

const LM = () => {
  const rows = Array.from(document.querySelectorAll('#ledger .row'));
  const vh = window.innerHeight;
  const infos = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  const f = infos[0];
  const vis = Math.max(0, Math.min(f.bottom, vh) - Math.max(f.top, 0));
  return {
    vh, firstTop: f.top, firstH: f.h, complete: infos.filter((x) => x.top >= 0 && x.bottom <= vh).length,
    firstVisiblePct: +(vis / f.h * 100).toFixed(1),
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { heights: {}, detailHeights: {} };

// 1) 列表：844 与真实可视高
for (const h of [844, 800, 750, 720, 700, 667, 600]) {
  const p = await browser.newPage({ width: 390, height: h, dsf: 2, mobile: true });
  out.heights[h] = {};
  for (const [k, code] of Object.entries({ BASE: '', A4: 'A4();', A5: 'A5();' })) {
    await p.goto(PAGE, { settleMs: 1300 });
    if (code) { await p.eval((x) => { new Function(x)(); }, LH + code); await new Promise((r) => setTimeout(r, 250)); }
    out.heights[h][k] = await p.eval(LM);
    const m = out.heights[h][k];
    console.log(`[vh=${h}] ${k.padEnd(5)} 首卡top=${String(m.firstTop).padStart(7)} h=${String(m.firstH).padStart(6)} 完整=${m.complete} 可见=${String(m.firstVisiblePct).padStart(5)}%`);
  }
  await p.close();
}

// 2) 详情：同一 scrollHeight 在不同可视高下的屏数
out.detailHeights = (() => {
  const sh = { BASE: { min: 3538, max: 4668 }, N3: { min: 2775, max: 3740 }, R2: { min: 1891, max: 2413 } };
  const r = {};
  for (const h of [844, 750, 700, 667]) {
    r[h] = {};
    for (const k of Object.keys(sh)) r[h][k] = { maxScreens: +(sh[k].max / h).toFixed(2), minScreens: +(sh[k].min / h).toFixed(2) };
  }
  return r;
})();

// 3) viewport 单位：100vh / 40vh 在可视视口变小时的表现（模拟 iOS 地址栏）
{
  const p = await browser.newPage({ width: 390, height: 700, dsf: 2, mobile: true });
  await p.goto(PAGE, { settleMs: 1300 });
  out.vhUnits = await p.eval(() => {
    const rail = document.querySelector('.rail');
    return {
      innerHeight: innerHeight,
      railMaxHeight: getComputedStyle(rail).maxHeight,
      railH: +rail.getBoundingClientRect().height.toFixed(1),
      // 40vh 是「布局视口」的 40%，不是可视视口的 40%
      fortyVh: +(innerHeight * 0.4).toFixed(1),
      vhSupport: CSS.supports('height', '100dvh'),
      svhSupport: CSS.supports('height', '100svh'),
    };
  });
  await p.eval(() => { document.querySelector('.row[data-id="S01"]').click(); });
  await new Promise((r) => setTimeout(r, 350));
  out.vhUnits.detail = await p.eval(() => {
    const d = document.getElementById('detail');
    return { h: +d.getBoundingClientRect().height.toFixed(1), scrollH: d.scrollHeight, innerHeight: innerHeight };
  });
  await p.close();
}

// 4) 首卡 453.2px 的构成（A5 后）——看还有没有余量可挖
{
  const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE, { settleMs: 1300 });
  await p.eval((x) => { new Function(x)(); }, LH + 'A5();');
  await new Promise((r) => setTimeout(r, 250));
  out.a5Card = await p.eval(() => {
    const r = document.querySelector('#ledger .row');
    const out = { total: +r.getBoundingClientRect().height.toFixed(1) };
    for (const sel of ['.no', '.row-head', '.row-def', '.row-meta', '.row-family', '.swatches', '.shots', '.row-foot']) {
      const e = r.querySelector(sel);
      if (e) out[sel] = +e.getBoundingClientRect().height.toFixed(1);
    }
    const img = r.querySelector('.shots .shot:first-child img');
    if (img) out.imgH = +img.getBoundingClientRect().height.toFixed(1);
    const cap = r.querySelector('.shot figcaption');
    if (cap) out.capH = +cap.getBoundingClientRect().height.toFixed(1);
    out.footText = r.querySelector('.row-foot') ? r.querySelector('.row-foot').textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : null;
    return out;
  });
  await p.close();
}

writeFileSync(join(HERE, '_p4_sensitivity.json'), JSON.stringify(out, null, 1));
console.log('\n detailHeights:', JSON.stringify(out.detailHeights));
console.log(' vhUnits:', JSON.stringify(out.vhUnits));
console.log(' a5Card:', JSON.stringify(out.a5Card));
await browser.close();
