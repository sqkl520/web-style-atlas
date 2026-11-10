// _lab3.mjs — 改用「HTML 里 <details open> + 窄屏内联脚本收起 + 宽档 CSS 藏 summary」模型
// 为什么不走 ::details-content：那条只在 Chromium 131+ 成立，Firefox/Safari 桌面档会把
// 两段散文吞掉（真内容丢失）。open 模型无 JS 时 = 今天的样子（两档都不回归），
// 有 JS 时窄档才收起；而本页离了 app.js 一行都渲染不出来，初始态由脚本给是一致的。
//
// 本轮扫描：390 档 chrome 的三个可调项 × 行卡两档，找「首卡 ≤600 且首屏 ≥1 完整卡」；
// 768 / 1440 同时验证不回归。foot 字号锁 13px（仓库「小字下限 13px」的既有决定）。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 源码形态：details 带 open，summary 是第一个孩子
const BUILD = `
  var claim = document.querySelector('.mast-claim');
  var exit  = document.querySelector('.mast-exit');
  var fold = document.createElement('details');
  fold.className = 'mast-fold'; fold.id = 'mast-fold'; fold.open = true;
  var sum = document.createElement('summary');
  sum.className = 'mast-fold-sum';
  sum.textContent = '这个图集是什么 · 打不开原型时看这里';
  claim.parentNode.insertBefore(fold, claim);
  fold.appendChild(sum); fold.appendChild(claim); fold.appendChild(exit);

  var rail = document.querySelector('.rail');
  var rfold = document.createElement('details');
  rfold.className = 'rail-fold'; rfold.id = 'rail-fold'; rfold.open = true;
  var rsum = document.createElement('summary');
  rsum.className = 'rail-fold-sum';
  rsum.textContent = '筛选 · 11 组（先按你是做什么的挑）';
  var rbody = document.createElement('div');
  rbody.className = 'rail-fold-body';
  while (rail.firstChild) rbody.appendChild(rail.firstChild);
  rfold.appendChild(rsum); rfold.appendChild(rbody);
  rail.appendChild(rfold);

  var bar = document.querySelector('.bar');
  var sort = document.querySelector('.sort');
  var bfold = document.createElement('details');
  bfold.className = 'bar-fold'; bfold.id = 'bar-fold'; bfold.open = true;
  var bsum = document.createElement('summary');
  bsum.className = 'bar-fold-sum'; bsum.textContent = '排序';
  bfold.appendChild(bsum);
  sort.parentNode.insertBefore(bfold, sort);
  bfold.appendChild(sort);

  // 窄档脚本：与将要写进 index.html 的那段同义
  var FOLDS = [fold, rfold, bfold];
  function syncFolds(){
    var narrow = window.innerWidth <= 980;
    for (var i = 0; i < FOLDS.length; i++) FOLDS[i].open = !narrow;
  }
  syncFolds();
  window.addEventListener('resize', syncFolds);
`;

const css = (o) => `
  /* 宽档：summary 藏掉。<details open> 的子元素本来就在渲染，不需要 ::details-content */
  @media (min-width: 981px) {
    .mast-fold > summary, .rail-fold > summary, .bar-fold > summary { display: none; }
    .mast-fold { display: block; }
  }
  @media (max-width: 980px) {
    .mast-fold, .rail-fold, .bar-fold { border: 0; }
    .mast-fold-sum, .rail-fold-sum, .bar-fold-sum {
      list-style-position: inside; cursor: pointer;
      font-size: 13px; line-height: 1.35; font-weight: 600; color: var(--ink-2);
      min-height: 44px; display: flex; align-items: center;
    }
    .mast-fold-sum { padding: ${o.mastSumPad}px 0; border-top: 1px solid var(--rule); margin-top: ${o.mastSumMt}px; }
    .mast-fold[open] > .mast-fold-sum { color: var(--ink); margin-bottom: 2px; }
    .mast-fold .mast-claim { margin-top: 8px; }

    .rail { max-height: none; overflow: visible; padding: ${o.railPad}px var(--pad) 4px; }
    .rail-fold-sum { padding: 2px 0; }
    .rail-fold-body { padding-bottom: 2px; }
    .rail-lead { display: block; margin-bottom: 10px; padding-bottom: 10px; }
    .rail-block { margin-bottom: 16px; }

    .bar { gap: 8px 10px; padding-bottom: ${o.barPad}px; }
    .search { flex: 1 1 100%; }
    .bar-fold-sum { padding: 5px 9px; border: 1px solid var(--rule-2); min-height: 34px; }
    .bar-fold[open] { flex: 1 1 100%; }
    .bar-fold[open] > .bar-fold-sum { margin-bottom: 6px; }
    .bar-fold .sort { margin: 4px 0; }
    .bar > .count { flex: 0 0 auto; }

    .mast { padding: ${o.mastPadT}px var(--pad) ${o.mastPadB}px; }
    .mast-wizard { margin-top: ${o.wizMt}px; }
    .mast-wizard a { padding: ${o.wizPad}px 11px; font-size: 14px; }
    .mast-facts { ${o.factsMode} }

    .shots .shot img { max-height: ${o.img}px; }
    .shots .shot:first-child { max-width: none; }
    .shot { position: relative; }
    .shot figcaption { position: absolute; right: 0; bottom: 0; padding: 1px 5px;
      background: rgba(242,242,238,.92); font-size: 13px; }
    .row { gap: ${o.gap}px; padding: ${o.pad}px 0; }
    .row-meta { gap: 4px 10px; margin-top: 8px; }
    ${o.family === 1 ? '.row-family { -webkit-line-clamp: 1; }' : ''}
    .row-foot { gap: 4px 10px; margin-top: 0; }
  }
`;

const FACTS_INLINE = `display: flex; flex-wrap: wrap; gap: 2px 16px; margin-top: 10px;
      border-top: 1px solid var(--ink); padding-top: 6px;`;
const FACTS_INLINE_CSS = FACTS_INLINE + `
    .mast-facts > div { display: flex; align-items: baseline; gap: 5px; border-top: 0; padding-top: 0; }
    .mast-facts dt { font-size: 13px; line-height: 1.45; }
    .mast-facts dd { font-size: 16px; line-height: 1.45; margin-top: 0; }`;

const MEASURE = () => {
  const q = (s) => document.querySelector(s);
  const h = (s) => { const e = q(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  const rows = [...document.querySelectorAll('.row')];
  const vh = innerHeight;
  const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  const de = document.documentElement;
  const r0 = rows[0];
  const inner = {};
  if (r0) { const rt = r0.getBoundingClientRect().top;
    for (const [k, sel] of Object.entries({ head: '.row-head', def: '.row-def', meta: '.row-meta', family: '.row-family', img: '.shots .shot:first-child img', foot: '.row-foot' })) {
      const e = r0.querySelector(sel); if (e) inner[k] = +e.getBoundingClientRect().height.toFixed(1); } }
  return {
    mastH: h('.mast'), railH: h('.rail'), barH: h('.bar'), mainTopPad: getComputedStyle(q('.main')).paddingTop,
    firstRowTop: boxes[0]?.top, firstRowH: boxes[0]?.h,
    completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    partialCards: boxes.filter((b) => b.top < vh && b.bottom > vh).length,
    fitSlack: boxes[0] ? +(vh - (boxes[0].top + boxes[0].h)).toFixed(1) : null,
    docH: de.scrollHeight, overflowX: de.scrollWidth - de.clientWidth,
    folds: [...document.querySelectorAll('details')].filter((d) => /fold/.test(d.className)).map((d) => ({ id: d.id, open: d.open, sumH: +d.querySelector('summary').getBoundingClientRect().height.toFixed(1) })),
    inner,
    mastParts: [...document.querySelectorAll('.mast-id > *, .mast-facts')].map((e) => (e.className || e.tagName) + ':' + e.getBoundingClientRect().height.toFixed(1)),
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), rows: {} };

const KNOBS = [
  { tag: 'K1', mastPadT: 14, mastPadB: 10, wizMt: 8, wizPad: 6, factsMode: FACTS_INLINE_CSS, mastSumPad: 6, mastSumMt: 8, railPad: 4, barPad: 10, img: 104, family: 2, gap: 12, pad: 9 },
  { tag: 'K2', mastPadT: 12, mastPadB: 8, wizMt: 8, wizPad: 6, factsMode: FACTS_INLINE_CSS, mastSumPad: 4, mastSumMt: 6, railPad: 2, barPad: 8, img: 104, family: 2, gap: 12, pad: 9 },
  { tag: 'K3', mastPadT: 12, mastPadB: 8, wizMt: 8, wizPad: 6, factsMode: FACTS_INLINE_CSS, mastSumPad: 4, mastSumMt: 6, railPad: 2, barPad: 8, img: 88, family: 2, gap: 12, pad: 9 },
  { tag: 'K4', mastPadT: 12, mastPadB: 8, wizMt: 8, wizPad: 5, factsMode: FACTS_INLINE_CSS, mastSumPad: 4, mastSumMt: 6, railPad: 2, barPad: 8, img: 104, family: 2, gap: 10, pad: 8 },
  { tag: 'K5', mastPadT: 12, mastPadB: 8, wizMt: 8, wizPad: 5, factsMode: FACTS_INLINE_CSS, mastSumPad: 4, mastSumMt: 6, railPad: 2, barPad: 8, img: 88, family: 1, gap: 12, pad: 9 },
  { tag: 'K6', mastPadT: 12, mastPadB: 8, wizMt: 6, wizPad: 5, factsMode: FACTS_INLINE_CSS, mastSumPad: 2, mastSumMt: 4, railPad: 2, barPad: 8, img: 104, family: 2, gap: 10, pad: 8 },
];

for (const vp of [{ k: '390', w: 390, h: 844, dsf: 2, mobile: true }, { k: '1440', w: 1440, h: 900, dsf: 1, mobile: false }, { k: '768', w: 768, h: 1024, dsf: 1, mobile: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: vp.dsf, mobile: vp.mobile, reducedMotion: true });
  await p.goto(PAGE, { settleMs: 1600 });
  const base = await p.eval(MEASURE);
  out[vp.k] = { baseline: base, knobs: [] };
  console.log(`\n===== ${vp.k} 基线 mast=${base.mastH} rail=${base.railH} bar=${base.barH} 首卡=${base.firstRowTop} 卡高=${base.firstRowH} 完整=${base.completeCards}`);
  if (vp.k === '1440') console.log(`      mast: ${base.mastParts.join(' | ')}`);
  for (const o of KNOBS) {
    await p.goto(PAGE, { settleMs: 1200 });
    await p.eval((code) => { new Function(code)(); }, BUILD);
    await p.eval((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, css(o));
    await sleep(250);
    const m = await p.eval(MEASURE);
    out[vp.k].knobs.push({ tag: o.tag, ...o, ...m });
    console.log(`  ${o.tag} mast=${String(m.mastH).padStart(6)} rail=${String(m.railH).padStart(5)} bar=${String(m.barH).padStart(5)} 首卡=${String(m.firstRowTop).padStart(7)} 卡高=${String(m.firstRowH).padStart(6)} 完整=${m.completeCards} 余=${String(m.fitSlack).padStart(7)} ovX=${m.overflowX}` +
      ` Δ首卡=${(m.firstRowTop - base.firstRowTop).toFixed(1)} Δ完整=${m.completeCards - base.completeCards}` +
      (vp.k === '390' ? ((m.firstRowTop <= 600 && m.completeCards >= 1) ? '  ✓' : '  ✗') : '') +
      ` | ${m.mastParts.join(' ')}`);
    if (m.inner.img) console.log(`       行内 head=${m.inner.head} def=${m.inner.def} meta=${m.inner.meta} fam=${m.inner.family} img=${m.inner.img} foot=${m.inner.foot}`);
  }
  await p.close();
}
writeFileSync(join(HERE, 'data-67-lab3.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('\nwritten data-67-lab3.json');
