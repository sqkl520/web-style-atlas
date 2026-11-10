// _lab2.mjs — 最终形态定稿扫描：390 求「首卡 top ≤ 600 且首屏 ≥1 完整卡」，768 求改善，1440 求零回归
// 结构：mast 里 claim+exit 进 details（向导保留在外面）；rail 整体进 details；bar 里 sort 进 details
// 关键：≥981px 时用 ::details-content{content-visibility:visible} + 藏 summary 把三者"展开"，
//       保证桌面档 DOM 结构变了但渲染一模一样（已用 AX 树验证正文仍在、链接仍可 Tab）。
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
  fold.className = 'mast-fold'; fold.id = 'mast-fold';
  var sum = document.createElement('summary');
  sum.className = 'mast-fold-sum';
  var lede = document.createElement('span');
  lede.className = 'mast-fold-lede';
  lede.textContent = '这个图集是什么 · 打不开原型时看这里';
  sum.appendChild(lede);
  claim.parentNode.insertBefore(fold, claim);
  fold.appendChild(sum); fold.appendChild(claim); fold.appendChild(exit);
  fold.open = false;

  var rail = document.querySelector('.rail');
  var rfold = document.createElement('details');
  rfold.className = 'rail-fold'; rfold.id = 'rail-fold';
  var rsum = document.createElement('summary');
  rsum.className = 'rail-fold-sum';
  rsum.textContent = '筛选 · 11 组（先按你是做什么的挑）';
  var rbody = document.createElement('div');
  rbody.className = 'rail-fold-body';
  while (rail.firstChild) rbody.appendChild(rail.firstChild);
  rfold.appendChild(rsum); rfold.appendChild(rbody);
  rail.appendChild(rfold); rfold.open = false;

  var bar = document.querySelector('.bar');
  var sort = document.querySelector('.sort');
  var bfold = document.createElement('details');
  bfold.className = 'bar-fold'; bfold.id = 'bar-fold';
  var bsum = document.createElement('summary');
  bsum.className = 'bar-fold-sum'; bsum.textContent = '排序';
  bfold.appendChild(bsum);
  sort.parentNode.insertBefore(bfold, sort);
  bfold.appendChild(sort);
  bfold.open = false;
`;

// 窄档（≤980px）样式：将来原样写进 style.css 末尾的 @media (max-width: 980px)
const narrow = (o) => `
  .mast { padding: 14px var(--pad) 10px; }
  .mast h1 { margin-bottom: 0; }
  .mast-claim { margin-top: 10px; }
  .mast-wizard { margin-top: 10px; }
  .mast-wizard a { padding: 7px 11px; font-size: 14px; }

  .mast-fold { margin-top: 10px; border-top: 1px solid var(--rule); }
  .mast-fold-sum {
    min-height: 44px; display: flex; align-items: center;
    padding: 6px 0; cursor: pointer; list-style-position: inside;
    font-size: 13px; line-height: 1.4; font-weight: 600; color: var(--ink-2);
  }
  .mast-fold[open] > .mast-fold-sum { color: var(--ink); }

  .mast-facts { margin-top: 10px; }
  .mast-facts > div { padding-top: ${o.factsPad}px; }
  .mast-facts dt { font-size: ${o.factsDt}px; line-height: 1.35; }
  .mast-facts dd { font-size: ${o.factsDd}px; line-height: 1.3; }

  .rail { max-height: none; overflow: visible; padding: 4px var(--pad) 6px; }
  .rail-fold-sum {
    min-height: 44px; display: flex; align-items: center;
    padding: 4px 0; cursor: pointer; list-style-position: inside;
    font-size: 13px; line-height: 1.4; font-weight: 600;
  }
  .rail-fold-body { padding-bottom: 4px; }
  .rail-lead { display: block; margin-bottom: 12px; padding-bottom: 12px; }

  .bar { gap: 8px 10px; padding-bottom: ${o.barPad}px; }
  .search { flex: 1 1 100%; }
  .bar > .count { flex: 0 0 auto; }
  .bar-fold-sum {
    min-height: 34px; display: flex; align-items: center;
    padding: 6px 10px; cursor: pointer; list-style-position: inside;
    font-size: 13px; line-height: 1.3;
    border: 1px solid var(--rule-2); color: var(--ink-2);
  }
  .bar-fold[open] { flex: 1 1 100%; }
  .bar-fold[open] > .bar-fold-sum { margin-bottom: 6px; }
  .bar-fold .sort { margin: 6px 0; }

  .shots .shot img { max-height: ${o.img}px; }
  .shots .shot:first-child { max-width: none; }
  ${o.overlay ? `.shot { position: relative; }
  .shot figcaption { position: absolute; right: 0; bottom: 0; padding: 1px 5px;
    background: rgba(242,242,238,.92); font-size: 13px; }` : ''}
  .row { gap: ${o.gap}px; padding: ${o.pad}px 0; }
  .row-meta { gap: 4px 10px; margin-top: 8px; }
  ${o.family === 1 ? '.row-family { -webkit-line-clamp: 1; }' : ''}
  .row-foot { gap: 4px 10px; margin-top: 0; }
`;

const DEFOLD = `
  @media (min-width: 981px) {
    .mast-fold::details-content, .rail-fold::details-content, .bar-fold::details-content {
      content-visibility: visible !important;
    }
    .mast-fold-sum, .rail-fold-sum, .bar-fold-sum { display: none !important; }
    .mast-fold { border-top: 0; margin-top: 0; }
  }
`;

const MEASURE = () => {
  const q = (s) => document.querySelector(s);
  const h = (s) => { const e = q(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  const rows = [...document.querySelectorAll('.row')];
  const vh = innerHeight;
  const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  const de = document.documentElement;
  return {
    mastH: h('.mast'), railH: h('.rail'), barH: h('.bar'), railScrollH: q('.rail')?.scrollHeight,
    firstRowTop: boxes[0]?.top, firstRowH: boxes[0]?.h,
    firstBottom: boxes[0] ? +(boxes[0].top + boxes[0].h).toFixed(1) : null,
    completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    partialCards: boxes.filter((b) => b.top < vh && b.bottom > vh).length,
    fitSlack: boxes[0] ? +(vh - (boxes[0].top + boxes[0].h)).toFixed(1) : null,
    docH: de.scrollHeight, overflowX: de.scrollWidth - de.clientWidth,
    mastParts: [...document.querySelectorAll('.mast-id > *, .mast-facts')].map((e) => (e.className || e.tagName) + ':' + e.getBoundingClientRect().height.toFixed(1)),
    barParts: [...document.querySelectorAll('.bar > *')].map((e) => (e.id || e.className || e.tagName) + ':' + e.getBoundingClientRect().height.toFixed(1)),
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), sweep: {} };

const KNOBS = [];
for (const img of [104, 88]) for (const family of [2, 1]) for (const factsDt of [13, 12]) {
  KNOBS.push({ img, family, overlay: true, gap: 12, pad: 9, factsDt, factsDd: factsDt + 3, factsPad: 5, barPad: 12 });
}
// 两个极端对照
KNOBS.push({ img: 104, family: 2, overlay: true, gap: 12, pad: 9, factsDt: 14, factsDd: 24, factsPad: 8, barPad: 16 }); // 现状 facts 不动
KNOBS.push({ img: 88, family: 2, overlay: true, gap: 10, pad: 8, factsDt: 12, factsDd: 15, factsPad: 4, barPad: 10 });

for (const vp of [{ k: '390', w: 390, h: 844, dsf: 2, mobile: true }, { k: '768', w: 768, h: 1024, dsf: 1, mobile: false }, { k: '1440', w: 1440, h: 900, dsf: 1, mobile: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: vp.dsf, mobile: vp.mobile, reducedMotion: true });
  await p.goto(PAGE, { settleMs: 1600 });
  const base = await p.eval(MEASURE);
  out[vp.k] = { baseline: base, rows: [] };
  console.log(`\n===== ${vp.k} 基线: mast=${base.mastH} rail=${base.railH} bar=${base.barH} 首卡=${base.firstRowTop} 卡高=${base.firstRowH} 完整=${base.completeCards} ovX=${base.overflowX}`);
  if (vp.k !== '390') console.log(`      mast 组成: ${base.mastParts.join(' | ')}`);

  for (const o of KNOBS) {
    await p.goto(PAGE, { settleMs: 1100 });
    await p.eval((code) => { new Function(code)(); }, BUILD);
    await p.eval((css) => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }, narrow(o) + DEFOLD);
    await sleep(200);
    const m = await p.eval(MEASURE);
    const key = `img=${o.img} fam=${o.family} dt=${o.factsDt} pad=${o.pad}/gap=${o.gap} barPad=${o.barPad}`;
    out[vp.k].rows.push({ key, ...o, ...m });
    console.log(`  ${key.padEnd(40)} mast=${String(m.mastH).padStart(5)} rail=${String(m.railH).padStart(5)} bar=${String(m.barH).padStart(5)} 首卡=${String(m.firstRowTop).padStart(6)} 卡高=${String(m.firstRowH).padStart(6)} 完整=${m.completeCards} 余=${String(m.fitSlack).padStart(6)} ovX=${m.overflowX}` +
      (vp.k === '390' ? (m.firstRowTop <= 600 && m.completeCards >= 1 ? '  ✓达标' : '  ✗') : '') +
      (vp.k !== '390' ? ` Δ首卡=${(m.firstRowTop - base.firstRowTop).toFixed(1)} Δ完整=${m.completeCards - base.completeCards}` : ''));
  }
  await p.close();
}

writeFileSync(join(HERE, 'data-67-lab2.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('\nwritten data-67-lab2.json');
