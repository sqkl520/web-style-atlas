// m11-firstscreen2.mjs — 首屏方案的"极限版"：把 rail 移到清单之后、工具条并进页头、量「首卡可见比例」
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const SHOTS = join(HERE, 'shots-mobile');
mkdirSync(SHOTS, { recursive: true });

const HELPERS = `
  function addStyle(css) { var s = document.createElement('style'); s.setAttribute('data-lab','1'); s.textContent = css; document.head.appendChild(s); }
  var ROW_COMPACT = '.shots .shot img{max-height:120px}.shot{position:relative}'
    + '.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 4px;background:rgba(220,220,214,.92)}'
    + '.row-family{-webkit-line-clamp:1}';
  var HEAD_TIGHT = '.mast{padding:12px 16px 10px;gap:8px}'
    + '.mast-kicker{font-size:12px;margin-bottom:4px}'
    + '.mast h1{font-size:24px;line-height:1.1}'
    + '.mast-claim{display:none}.mast-exit{display:none}'
    + '.mast-wizard{margin-top:6px}.mast-wizard a{padding:5px 9px;font-size:13px}'
    + '.mast-facts{display:flex;margin-top:6px}'
    + '.mast-facts>div{flex:1 1 0;border-top:1px solid var(--ink);padding-top:3px}'
    + '.mast-facts dt{font-size:10px;line-height:1.25}.mast-facts dd{font-size:16px;margin-top:0;line-height:1.15}';
  // 工具条压成两行：搜索满宽一行；计数+排序+清空挤第二行
  var BAR_TIGHT = '.bar{padding-bottom:8px;gap:6px 8px}'
    + '.search{flex:1 1 100%}.search input{padding:5px 8px}'
    + '.bar .count{order:3;font-size:12px}.bar .sort{order:4;gap:4px}.bar .sort label{display:none}'
    + '.sort select{padding:4px 6px;font-size:13px}.btn-quiet{padding:4px 8px;font-size:12px;order:5}';
  function railToSummary(text) {
    var rail = document.querySelector('.rail');
    var d = document.createElement('details');
    d.setAttribute('data-lab','1');
    var s = document.createElement('summary');
    s.textContent = text;
    s.style.cssText = 'min-height:44px;display:flex;align-items:center;font-size:14px;font-weight:600;padding:10px 0;cursor:pointer;list-style-position:inside';
    var body = document.createElement('div');
    while (rail.firstChild) body.appendChild(rail.firstChild);
    d.appendChild(s); d.appendChild(body);
    rail.appendChild(d);
    rail.style.maxHeight = 'none'; rail.style.overflow = 'visible'; rail.style.padding = '4px 16px 8px';
    d.open = false;
  }
  function railBelowLedger(text) {
    var rail = document.querySelector('.rail');
    var main = document.querySelector('.main');
    var bench = document.querySelector('.bench');
    railToSummary(text);
    rail.style.borderTop = '2px solid var(--ink)';
    rail.style.borderBottom = 'none';
    bench.appendChild(rail); // .rail 在 DOM 中本来在 .main 前，append 后落到 .main 之后
  }
`;

const V = {
  'D0-现状': '',
  'D1-rail折+行卡收紧': `railToSummary('筛选与场景反查（11 组 · 47 颗芯片）');addStyle(ROW_COMPACT);`,
  'D2-D1+页头瘦身': `railToSummary('筛选与场景反查（11 组 · 47 颗芯片）');addStyle(ROW_COMPACT + HEAD_TIGHT);`,
  'D3-D2+工具条两行': `railToSummary('筛选与场景反查（11 组 · 47 颗芯片）');addStyle(ROW_COMPACT + HEAD_TIGHT + BAR_TIGHT);`,
  'D4-D3+rail移到清单后': `railBelowLedger('筛选与场景反查（11 组 · 47 颗芯片）');addStyle(ROW_COMPACT + HEAD_TIGHT + BAR_TIGHT);`,
  'D5-D4+行卡再收': `railBelowLedger('筛选与场景反查（11 组 · 47 颗芯片）');addStyle(ROW_COMPACT + HEAD_TIGHT + BAR_TIGHT + '.row{padding:9px 0;gap:14px}.row-def{-webkit-line-clamp:2;font-size:15px}.row-head h3{font-size:17px}');`,
};

const MEASURE = () => {
  const rows = Array.from(document.querySelectorAll('.row'));
  const vh = window.innerHeight;
  const infos = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  const first = infos[0];
  const visiblePx = Math.max(0, Math.min(first.bottom, vh) - Math.max(first.top, 0));
  const g = (sel) => { const e = document.querySelector(sel); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  const t = (sel) => { const e = document.querySelector(sel); return e ? +e.getBoundingClientRect().top.toFixed(1) : null; };
  const de = document.documentElement;
  return {
    mastH: g('.mast'), railH: g('.rail'), railTop: t('.rail'), barH: g('.bar'),
    firstRowTop: first.top, firstRowH: first.h,
    firstCardVisiblePx: +visiblePx.toFixed(1),
    firstCardVisiblePct: +(visiblePx / first.h * 100).toFixed(1),
    completeCards: infos.filter((x) => x.top >= 0 && x.bottom <= vh).length,
    partialCards: infos.filter((x) => x.top < vh && x.bottom > vh).length,
    docH: de.scrollHeight, overflowX: de.scrollWidth - de.clientWidth,
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), vps: {} };
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '414', w: 414, h: 896, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  out.vps[vp.k] = {};
  for (const [k, code] of Object.entries(V)) {
    await p.goto(PAGE, { settleMs: 1400 });
    if (code) {
      await p.eval((payload) => { new Function(payload.helpers + payload.code)(); }, { helpers: HELPERS, code });
      await new Promise((r) => setTimeout(r, 300));
    }
    const m = await p.eval(MEASURE);
    m.key = k;
    out.vps[vp.k][k] = m;
    console.log(`[${vp.k}] ${k.padEnd(20)} mast=${String(m.mastH).padStart(5)} rail=${String(m.railH).padStart(5)}@${String(m.railTop).padStart(6)} bar=${String(m.barH).padStart(5)} 首卡top=${String(m.firstRowTop).padStart(6)} 卡高=${String(m.firstRowH).padStart(6)} 可见=${String(m.firstCardVisiblePct).padStart(5)}% 完整=${m.completeCards} ovX=${m.overflowX}`);
    if (vp.k !== '1440') {
      await p.eval(() => window.scrollTo(0, 0));
      await new Promise((r) => setTimeout(r, 180));
      await p.screenshot({ path: join(SHOTS, `first2-${k}-${vp.k}.png`), format: 'png' });
    }
  }
  await p.close();
}
writeFileSync(join(HERE, 'data-m11-firstscreen2.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('written data-m11-firstscreen2.json');
