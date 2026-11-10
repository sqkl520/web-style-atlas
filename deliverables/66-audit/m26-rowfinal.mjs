// m26-rowfinal.mjs — 390 档「首屏 1 张完整卡」到底要付多少：逐级收紧行卡，量每级代价
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const SHOTS = join(HERE, 'shots-mobile');
mkdirSync(SHOTS, { recursive: true });

const LH = `
  function addStyle(css) { var s = document.createElement('style'); s.setAttribute('data-lab','1'); s.textContent = css; document.head.appendChild(s); }
  function railToSummary() {
    var rail = document.querySelector('.rail');
    var d = document.createElement('details'); d.setAttribute('data-lab','1');
    var s = document.createElement('summary'); s.textContent = '筛选与场景反查 · 11 组 47 颗芯片';
    s.style.cssText = 'display:flex;align-items:center;font-size:14px;font-weight:600;padding:0 0 0 20px;min-height:48px;cursor:pointer;list-style-position:inside';
    var body = document.createElement('div');
    while (rail.firstChild) body.appendChild(rail.firstChild);
    d.appendChild(s); d.appendChild(body); rail.appendChild(d);
    rail.style.maxHeight = 'none'; rail.style.overflow = 'visible';
    rail.style.padding = '0 16px 6px'; rail.style.borderBottom = '2px solid var(--ink)';
    d.open = false;
  }
  function headFold() {
    var claim = document.querySelector('.mast-claim');
    var exit = document.querySelector('.mast-exit');
    var d = document.createElement('details'); d.setAttribute('data-lab','1');
    var s = document.createElement('summary'); s.textContent = '这个图集是什么 · 想要现成模板去哪';
    s.style.cssText = 'font-size:13px;color:var(--ink-2);padding:6px 0;cursor:pointer;line-height:1.6;min-height:24px';
    claim.parentNode.insertBefore(d, claim);
    d.appendChild(s); d.appendChild(claim); d.appendChild(exit);
    d.open = false;
    addStyle('.mast{padding:12px 16px 10px;gap:8px}'
      + '.mast-kicker{font-size:12px;margin-bottom:4px}'
      + '.mast h1{font-size:26px;line-height:1.1}'
      + '.mast-wizard{margin-top:6px}.mast-wizard a{padding:6px 10px;font-size:14px}'
      + '.mast-facts{display:flex;margin-top:6px;gap:0}'
      + '.mast-facts>div{flex:1 1 0;border-top:1px solid var(--ink);padding-top:3px}'
      + '.mast-facts dt{font-size:11px;line-height:1.25}.mast-facts dd{font-size:17px;margin-top:0;line-height:1.15}'
      + '.mast-claim{margin-top:10px}.mast-exit{margin-top:8px}');
  }
  function barTight() {
    addStyle('.bar{padding-bottom:8px;gap:6px 8px}.search{flex:1 1 100%}.search input{padding:6px 8px}'
      + '.bar .count{order:3;font-size:12px}.bar .sort{order:4;gap:4px}.bar .sort label{display:none}'
      + '.sort select{padding:6px 6px;font-size:13px}.btn-quiet{padding:6px 8px;font-size:13px;order:5}');
  }
  var BASE = 'railToSummary();headFold();barTight();';
`;

// 逐级行卡收紧，每级标注"代价"
const V = {
  'L4 行卡：图120+图注叠字+家族1行': `.shots .shot img{max-height:120px}.shot{position:relative}.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 4px;background:rgba(220,220,214,.92)}.row-family{-webkit-line-clamp:1}`,
  'L5 L4+行内距13→9、gap20→14': `.shots .shot img{max-height:120px}.shot{position:relative}.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 4px;background:rgba(220,220,214,.92)}.row-family{-webkit-line-clamp:1}.row{padding:9px 0;gap:14px}`,
  'L6 L5+图100高': `.shots .shot img{max-height:120px}.shot{position:relative}.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 4px;background:rgba(220,220,214,.92)}.row-family{-webkit-line-clamp:1}.row{padding:9px 0;gap:14px}.shots .shot img{max-height:100px}`,
  'L7 L6+家族行并进元数据（不独占一行）': `.shots .shot img{max-height:120px}.shot{position:relative}.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 4px;background:rgba(220,220,214,.92)}.row-family{-webkit-line-clamp:1;flex:0 1 auto !important}.row{padding:9px 0;gap:14px}.shots .shot img{max-height:100px}`,
  'L8 L7+行脚注折成一行': `.shots .shot img{max-height:120px}.shot{position:relative}.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 4px;background:rgba(220,220,214,.92)}.row-family{-webkit-line-clamp:1;flex:0 1 auto !important}.row{padding:9px 0;gap:14px}.shots .shot img{max-height:100px}.row-foot{display:none}`,
};

const LM = () => {
  const rows = Array.from(document.querySelectorAll('.row'));
  const vh = window.innerHeight;
  const infos = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  const first = infos[0];
  const vis = Math.max(0, Math.min(first.bottom, vh) - Math.max(first.top, 0));
  const g = (s) => { const e = document.querySelector(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  // 首屏内首卡能看到哪些部位
  const seen = [];
  ['.no', '.row-head h3', '.row-def', '.row-family', '.swatches', '.shots .shot:first-child img', '.row-foot'].forEach((sel) => {
    const e = document.querySelector('.row ' + sel);
    if (!e) return;
    const r = e.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0) seen.push(sel + (r.bottom <= vh ? '(完整)' : '(被切)'));
  });
  return {
    vh, mastH: g('.mast'), railH: g('.rail'), barH: g('.bar'),
    firstRowTop: first.top, firstRowH: first.h, firstRowBottom: first.bottom,
    firstVisiblePct: +(vis / first.h * 100).toFixed(1),
    complete: infos.filter((x) => x.top >= 0 && x.bottom <= vh).length,
    partial: infos.filter((x) => x.top < vh && x.bottom > vh).length,
    docH: document.documentElement.scrollHeight,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    seen,
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), vps: {} };
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '414', w: 414, h: 896, m: true }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  out.vps[vp.k] = {};
  for (const [k, rowcss] of Object.entries(V)) {
    await p.goto(PAGE, { settleMs: 1400 });
    await p.eval((payload) => { new Function(payload.h + payload.c)(); }, { h: LH, c: `railToSummary();headFold();barTight();addStyle(${JSON.stringify(rowcss)});` });
    await new Promise((r) => setTimeout(r, 320));
    out.vps[vp.k][k] = await p.eval(LM);
    const m = out.vps[vp.k][k];
    console.log(`[${vp.k}] ${k.padEnd(34)} 首卡 ${m.firstRowTop}–${m.firstRowBottom} (h=${m.firstRowH}) 完整卡=${m.complete} 可见=${m.firstVisiblePct}% ovX=${m.overflowX}`);
    console.log(`       首屏可见部位: ${m.seen.join(' ')}`);
    if (vp.k === '390') {
      await p.eval(() => window.scrollTo(0, 0));
      await new Promise((r) => setTimeout(r, 180));
      await p.screenshot({ path: join(SHOTS, `rowfinal-${k.split(' ')[0]}-390.png`), format: 'png' });
    }
  }
  await p.close();
}
writeFileSync(join(HERE, 'data-m26-rowfinal.json'), JSON.stringify(out, null, 1));
await browser.close();
