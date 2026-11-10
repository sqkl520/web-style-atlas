// m10-firstscreen.mjs — 「首屏能看到几张完整卡」的组合矩阵：页头 × rail × 行卡
// 390×844 与 414×896。全部在 DOM 上动态改。
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
  function collapseRail(summaryText) {
    var rail = document.querySelector('.rail');
    var d = document.createElement('details');
    d.setAttribute('data-lab','1');
    var s = document.createElement('summary');
    s.textContent = summaryText;
    s.style.cssText = 'min-height:44px;display:flex;align-items:center;font-size:14px;font-weight:600;padding:10px 0;cursor:pointer;list-style-position:inside';
    var body = document.createElement('div');
    while (rail.firstChild) body.appendChild(rail.firstChild);
    d.appendChild(s); d.appendChild(body);
    rail.appendChild(d);
    rail.style.maxHeight = 'none'; rail.style.overflow = 'visible'; rail.style.padding = '4px 16px 8px';
    d.open = false;
  }
  var ROW_COMPACT = '.shots .shot img{max-height:120px}'
    + '.shot{position:relative}'
    + '.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 4px;background:rgba(220,220,214,.92)}'
    + '.row-meta{gap:4px 10px}'
    + '.row-family{-webkit-line-clamp:1}'
    + '.row-meta .row-family{flex:1 1 100%}';
`;

const V = {
  'C0-现状': { label: '现状（不动任何东西）', code: '' },
  'C1-只折rail': { label: '只把 rail 折成 44px 条', code: `collapseRail('筛选与场景反查（11 组 · 47 颗芯片）');` },
  'C2-rail+页头瘦身': { label: 'C1 + 页头把 wizard/exit 并成一行、claim 收到 3 行、facts 压成一行', code: `
    collapseRail('筛选与场景反查（11 组 · 47 颗芯片）');
    addStyle('.mast-gap{display:none}'
      + '.mast-claim{-webkit-line-clamp:3;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden;margin-top:6px;font-size:14px;line-height:1.55}'
      + '.mast-wizard{margin-top:6px}'
      + '.mast-wizard a{padding:6px 10px;font-size:14px}'
      + '.mast-exit{margin-top:6px;padding-top:6px;font-size:13px}'
      + '.mast-facts{display:flex;gap:0;margin-top:8px}'
      + '.mast-facts>div{flex:1 1 0;border-top:1px solid var(--ink);padding-top:4px}'
      + '.mast-facts dt{font-size:11px;line-height:1.3}'
      + '.mast-facts dd{font-size:17px;margin-top:0;line-height:1.2}');` },
  'C3-C2+行卡收紧': { label: 'C2 + 行卡收紧（缩略图 120、图注叠字、家族 1 行）', code: `
    collapseRail('筛选与场景反查（11 组 · 47 颗芯片）');
    addStyle('.mast-claim{-webkit-line-clamp:3;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden;margin-top:6px;font-size:14px;line-height:1.55}'
      + '.mast-wizard{margin-top:6px}.mast-wizard a{padding:6px 10px;font-size:14px}'
      + '.mast-exit{margin-top:6px;padding-top:6px;font-size:13px}'
      + '.mast-facts{display:flex;margin-top:8px}'
      + '.mast-facts>div{flex:1 1 0;border-top:1px solid var(--ink);padding-top:4px}'
      + '.mast-facts dt{font-size:11px;line-height:1.3}.mast-facts dd{font-size:17px;margin-top:0;line-height:1.2}');
    addStyle(ROW_COMPACT);` },
  'C4-C3+页头再砍': { label: 'C3 + 页头把 claim/exit 折进 <details>、facts 收进工具条', code: `
    collapseRail('筛选与场景反查（11 组 · 47 颗芯片）');
    addStyle(ROW_COMPACT);
    var mast = document.querySelector('.mast');
    // claim + exit 合并成一个折叠块
    var claim = document.querySelector('.mast-claim');
    var exit = document.querySelector('.mast-exit');
    var d = document.createElement('details');
    d.setAttribute('data-lab','1');
    var s = document.createElement('summary');
    s.textContent = '这个图集是什么 · 想要现成模板去哪';
    s.style.cssText = 'font-size:13px;color:var(--ink-2);padding:8px 0;cursor:pointer;line-height:1.6';
    claim.parentNode.insertBefore(d, claim);
    d.appendChild(s); d.appendChild(claim); d.appendChild(exit);
    d.open = false;
    addStyle('.mast-claim{margin-top:8px;font-size:14px;line-height:1.55}.mast-exit{margin-top:8px;font-size:13px}'
      + '.mast-wizard{margin-top:6px}.mast-wizard a{padding:6px 10px;font-size:14px}'
      + '.mast-facts{display:flex;margin-top:8px}'
      + '.mast-facts>div{flex:1 1 0;border-top:1px solid var(--ink);padding-top:4px}'
      + '.mast-facts dt{font-size:11px;line-height:1.3}.mast-facts dd{font-size:17px;margin-top:0;line-height:1.2}');` },
  'C5-C4+去facts': { label: 'C4 + 头四个数字块整块隐藏（最激进）', code: `
    collapseRail('筛选与场景反查（11 组 · 47 颗芯片）');
    addStyle(ROW_COMPACT);
    var mast = document.querySelector('.mast');
    var claim = document.querySelector('.mast-claim');
    var exit = document.querySelector('.mast-exit');
    var d = document.createElement('details');
    d.setAttribute('data-lab','1');
    var s = document.createElement('summary');
    s.textContent = '这个图集是什么 · 想要现成模板去哪';
    s.style.cssText = 'font-size:13px;color:var(--ink-2);padding:8px 0;cursor:pointer;line-height:1.6';
    claim.parentNode.insertBefore(d, claim);
    d.appendChild(s); d.appendChild(claim); d.appendChild(exit);
    d.open = false;
    document.querySelector('.mast-facts').style.display = 'none';
    addStyle('.mast-wizard{margin-top:6px}.mast-wizard a{padding:6px 10px;font-size:14px}');` },
};

const MEASURE = () => {
  const rows = Array.from(document.querySelectorAll('.row'));
  const vh = window.innerHeight;
  const infos = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  const complete = infos.filter((x) => x.top >= 0 && x.bottom <= vh).length;
  const partial = infos.filter((x) => x.top < vh && x.bottom > vh).length;
  const mast = document.querySelector('.mast'), rail = document.querySelector('.rail'), bar = document.querySelector('.bar');
  const g = (e) => (e ? +e.getBoundingClientRect().height.toFixed(1) : null);
  const t = (e) => (e ? +e.getBoundingClientRect().top.toFixed(1) : null);
  const de = document.documentElement;
  return {
    mastH: g(mast), railH: g(rail), barH: g(bar),
    firstRowTop: infos[0].top, firstRowH: infos[0].h,
    completeCards: complete, partialCards: partial,
    usedBeforeFirstCard: infos[0].top,
    docH: de.scrollHeight,
    overflowX: de.scrollWidth - de.clientWidth,
    // 首屏能看到什么（文字级）
    firstScreenText: document.elementFromPoint(195, 780)?.closest('.row')?.getAttribute('data-id') || null,
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), vps: {} };

for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '414', w: 414, h: 896, m: true }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  out.vps[vp.k] = {};
  for (const [k, v] of Object.entries(V)) {
    await p.eval((payload) => {
      document.querySelectorAll('style[data-lab], details[data-lab]').forEach((s) => s.remove());
      new Function(payload.helpers)();
      location.reload();
    }, { helpers: '' }).catch(() => {});
    // 单靠 reload 复位；等 load
    await new Promise((r) => setTimeout(r, 900));
    await p.eval((payload) => { new Function(payload.helpers + payload.code)(); }, { helpers: HELPERS, code: v.code || '' });
    await new Promise((r) => setTimeout(r, 350));
    const m = await p.eval(MEASURE);
    m.key = k; m.label = v.label;
    out.vps[vp.k][k] = m;
    console.log(`[${vp.k}] ${k.padEnd(16)} mast=${String(m.mastH).padStart(5)} rail=${String(m.railH).padStart(5)} bar=${String(m.barH).padStart(5)} firstRow=${String(m.firstRowTop).padStart(6)} rowH=${String(m.firstRowH).padStart(6)} 完整卡=${m.completeCards} 部分=${m.partialCards} ovX=${m.overflowX}`);
    if (vp.k === '390') {
      await p.eval(() => window.scrollTo(0, 0));
      await new Promise((r) => setTimeout(r, 200));
      await p.screenshot({ path: join(SHOTS, `first-${k}-390.png`), format: 'png' });
    }
  }
  await p.close();
}
writeFileSync(join(HERE, 'data-m10-firstscreen.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('written data-m10-firstscreen.json');
