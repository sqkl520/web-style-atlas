// _lab4.mjs — 定稿扫描：390 档必须同时满足「首卡 top ≤600」与「首屏 ≥1 完整卡」
// 保留：向导按钮在首屏可见（不折）、figcaption 不删（叠到图上）、家族文字不删（clamp 可调）
// 逐个零件量增量收益，最后给一组带余量的定稿值。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

  var FOLDS = [fold, rfold, bfold];
  function syncFolds(){ var n = window.innerWidth <= 980; for (var i=0;i<FOLDS.length;i++) FOLDS[i].open = !n; }
  syncFolds();
  window.addEventListener('resize', syncFolds);
`;

const CHROME = `
  @media (min-width: 981px) {
    .mast-fold > summary, .rail-fold > summary, .bar-fold > summary { display: none; }
  }
  @media (max-width: 980px) {
    .mast { padding: 12px var(--pad) 8px; }
    .mast-wizard { margin-top: 8px; }
    .mast-wizard a { padding: 5px 10px; font-size: 14px; }
    .mast-fold-sum, .rail-fold-sum, .bar-fold-sum {
      list-style-position: inside; cursor: pointer; font-size: 13px; line-height: 1.35;
      font-weight: 600; color: var(--ink-2); min-height: 44px; display: flex; align-items: center;
    }
    .mast-fold-sum { padding: 2px 0; border-top: 1px solid var(--rule); margin-top: 4px; }
    .mast-fold[open] > .mast-fold-sum { color: var(--ink); }
    .mast-fold .mast-claim { margin-top: 6px; }

    .mast-facts { display: flex; flex-wrap: wrap; gap: 2px 14px; margin-top: 8px;
      border-top: 1px solid var(--ink); padding-top: 5px; }
    .mast-facts > div { display: flex; align-items: baseline; gap: 5px; border-top: 0; padding-top: 0; }
    .mast-facts dt { font-size: 13px; line-height: 1.4; }
    .mast-facts dd { font-size: 16px; line-height: 1.4; margin-top: 0; }

    .rail { max-height: none; overflow: visible; padding: 2px var(--pad) 4px; }
    .rail-fold-sum { padding: 0; }
    .rail-fold-body { padding-bottom: 2px; }
    .rail-lead { display: block; margin-bottom: 10px; padding-bottom: 10px; }
    .rail-block { margin-bottom: 16px; }

    .bar { gap: 8px 10px; padding-bottom: __BARPAD__px; }
    .search { flex: 1 1 100%; }
    .bar-fold-sum { padding: 4px 9px; border: 1px solid var(--rule-2); min-height: 32px; }
    .bar-fold[open] { flex: 1 1 100%; }
    .bar-fold[open] > .bar-fold-sum { margin-bottom: 4px; }
    .bar-fold .sort { margin: 4px 0; }
  }
`;

// 行卡：每个零件单独可关，用来量增量收益
const rowCSS = (o) => `
  @media (max-width: 980px) {
    .shots .shot img { max-height: ${o.img}px; }
    .shots .shot:first-child { max-width: none; }
    ${o.overlay ? `.shot { position: relative; }
    .shot figcaption { position: absolute; right: 0; bottom: 0; padding: 0 4px;
      background: rgba(242,242,238,.92); font-size: 13px; line-height: 1.5; }` : ''}
    .row { gap: ${o.gap}px; padding: ${o.pad}px 0; }
    .row-head { gap: ${o.headGap}px 9px; }
    .row-meta { gap: 3px 10px; margin-top: ${o.metaMt}px; }
    ${o.family === 1 ? '.row-family { -webkit-line-clamp: 1; }' : ''}
    .row-foot { gap: 3px 10px; margin-top: ${o.footMt}px; line-height: ${o.footLh}; }
  }
`;

const MEASURE = () => {
  const q = (s) => document.querySelector(s);
  const h = (s) => { const e = q(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  const rows = [...document.querySelectorAll('.row')];
  const vh = innerHeight;
  const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  const r0 = rows[0];
  const inner = {};
  if (r0) { const rt = r0.getBoundingClientRect().top;
    for (const [k, sel] of Object.entries({ head: '.row-head', h3: '.row-head h3', def: '.row-def', meta: '.row-meta', family: '.row-family', shots: '.shots', img: '.shots .shot:first-child img', cap: '.shots figcaption', foot: '.row-foot', gtags: '.row-foot .gate-tags' })) {
      const e = r0.querySelector(sel); if (e) inner[k] = +e.getBoundingClientRect().height.toFixed(1); } }
  return {
    mastH: h('.mast'), railH: h('.rail'), barH: h('.bar'),
    firstRowTop: boxes[0]?.top, firstRowH: boxes[0]?.h,
    completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    partialCards: boxes.filter((b) => b.top < vh && b.bottom > vh).length,
    fitSlack: boxes[0] ? +(vh - (boxes[0].top + boxes[0].h)).toFixed(1) : null,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    docH: document.documentElement.scrollHeight,
    inner,
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), steps: {}, knobs: {} };
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true, reducedMotion: true });
await p.goto(PAGE, { settleMs: 1700 });
out.baseline = await p.eval(MEASURE);
console.log(`390 基线: mast=${out.baseline.mastH} rail=${out.baseline.railH} bar=${out.baseline.barH} 首卡=${out.baseline.firstRowTop} 卡高=${out.baseline.firstRowH} 完整=${out.baseline.completeCards}`);
console.log(`   行内: ${JSON.stringify(out.baseline.inner)}`);

const run = async (tag, cssText) => {
  await p.goto(PAGE, { settleMs: 1200 });
  await p.eval((code) => { new Function(code)(); }, BUILD);
  await p.eval((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, cssText);
  await sleep(220);
  const m = await p.eval(MEASURE);
  out.steps[tag] = m;
  const ok = m.firstRowTop <= 600 && m.completeCards >= 1;
  console.log(`  ${tag.padEnd(34)} mast=${String(m.mastH).padStart(5)} rail=${String(m.railH).padStart(4)} bar=${String(m.barH).padStart(4)} 首卡=${String(m.firstRowTop).padStart(6)} 卡高=${String(m.firstRowH).padStart(6)} bottom=${String(m.firstRowTop + m.firstRowH).padStart(6)} 完整=${m.completeCards} 余=${String(m.fitSlack).padStart(6)} ${ok ? '✓' : '✗'}`);
  return m;
};

// ① 只折 chrome（行卡不动）
await run('① chrome only', CHROME.replace('__BARPAD__', '8'));
// ② + 叠图注 + 图 104
await run('② +overlay img104', CHROME.replace('__BARPAD__', '8') + rowCSS({ img: 104, overlay: true, gap: 10, pad: 8, headGap: 4, metaMt: 6, family: 2, footMt: 0, footLh: 1.4 }));
// ③ + 图 88
await run('③ +img88', CHROME.replace('__BARPAD__', '8') + rowCSS({ img: 88, overlay: true, gap: 10, pad: 8, headGap: 4, metaMt: 6, family: 2, footMt: 0, footLh: 1.4 }));
// ④ + 家族 1 行
await run('④ +family1', CHROME.replace('__BARPAD__', '8') + rowCSS({ img: 88, overlay: true, gap: 10, pad: 8, headGap: 4, metaMt: 6, family: 1, footMt: 0, footLh: 1.4 }));
// ⑤ 图回到 104 但家族 1 行（保住图，牺牲家族第二行）
await run('⑤ img104+family1', CHROME.replace('__BARPAD__', '8') + rowCSS({ img: 104, overlay: true, gap: 10, pad: 8, headGap: 4, metaMt: 6, family: 1, footMt: 0, footLh: 1.4 }));
// ⑥ 图 96 + 家族 2 行
await run('⑥ img96+family2', CHROME.replace('__BARPAD__', '8') + rowCSS({ img: 96, overlay: true, gap: 10, pad: 8, headGap: 4, metaMt: 6, family: 2, footMt: 0, footLh: 1.4 }));
// ⑦ 图 80 + 家族 2 行
await run('⑦ img80+family2', CHROME.replace('__BARPAD__', '8') + rowCSS({ img: 80, overlay: true, gap: 10, pad: 8, headGap: 4, metaMt: 6, family: 2, footMt: 0, footLh: 1.4 }));
// ⑧ 最终候选：图 96 + 家族 2 行 + 页头再收
await run('⑧ 定稿候选', CHROME.replace('__BARPAD__', '6').replace('.mast { padding: 12px var(--pad) 8px; }', '.mast { padding: 10px var(--pad) 8px; }') + rowCSS({ img: 96, overlay: true, gap: 10, pad: 8, headGap: 4, metaMt: 6, family: 2, footMt: 0, footLh: 1.4 }));

writeFileSync(join(HERE, 'data-67-lab4.json'), JSON.stringify(out, null, 1));
await p.close();
await browser.close();
console.log('\nwritten data-67-lab4.json');
