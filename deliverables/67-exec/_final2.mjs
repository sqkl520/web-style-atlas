// _final2.mjs — 定稿（严守仓库「小字下限 13px」）：facts 保持 13/16px 两行，不靠降字号省钱
// 只在各自断点内生效，逐档量改前/改后。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const M = () => {
  const q = (s) => document.querySelector(s);
  const h = (s) => { const e = q(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  const rows = [...document.querySelectorAll('.row')];
  const vh = innerHeight;
  const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  return { mastH: h('.mast'), railH: h('.rail'), barH: h('.bar'), factsH: h('.mast-facts'),
    firstRowTop: boxes[0]?.top, firstRowH: boxes[0]?.h,
    completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    fitSlack: boxes[0] ? +(vh - (boxes[0].top + boxes[0].h)).toFixed(1) : null,
    maxRowH: Math.max(...boxes.map((b) => b.h)),
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    minFont: Math.min(...[...document.querySelectorAll('.row *, .mast *')].map((e) => parseFloat(getComputedStyle(e).fontSize)).filter((n) => n > 0)) };
};

const F = `
  @media (max-width: 980px) {
    .mast { padding: 8px var(--pad) 6px; }
    .mast-wizard a { line-height: 1.35; }
    .mast-facts { gap: 2px 10px; }
    .rail { padding: 0 var(--pad) 2px; }
    .bar { padding-bottom: 6px; gap: 6px 10px; }
    .search input { padding: 5px 10px; }
    .bar-fold-sum { min-height: 32px; }
  }
  @media (max-width: 620px) {
    .shots .shot:first-child { max-width: 176px; }
    .row-foot { line-height: 1.5; }
  }
`;

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true, reducedMotion: true });
for (const vp of [{ k: '390', w: 390, h: 844, d: 2, m: true }, { k: '414', w: 414, h: 896, d: 2, m: true }, { k: '768', w: 768, h: 1024, d: 1, m: false }, { k: '1440', w: 1440, h: 900, d: 1, m: false }]) {
  await p.setViewport({ width: vp.w, height: vp.h, dsf: vp.d, mobile: vp.m });
  await p.goto(SRC, { settleMs: 1500 });
  const b = await p.eval(M);
  await p.eval((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, F);
  await sleep(250);
  const a = await p.eval(M);
  const ok = vp.k === '390' ? (a.firstRowTop <= 600 && a.completeCards >= 1) : true;
  console.log(`\n[${vp.k}]  改前 首卡=${b.firstRowTop} 卡高=${b.firstRowH} 完整=${b.completeCards} mast=${b.mastH} rail=${b.railH} bar=${b.barH} facts=${b.factsH}`);
  console.log(`        改后 首卡=${a.firstRowTop} 卡高=${a.firstRowH} 最高=${a.maxRowH} 完整=${a.completeCards} 余=${a.fitSlack} mast=${a.mastH} rail=${a.railH} bar=${a.barH} facts=${a.factsH} ovX=${a.overflowX} minFont=${a.minFont} ${ok ? '✓' : '✗'}`);
  console.log(`        Δ首卡=${(a.firstRowTop - b.firstRowTop).toFixed(1)} Δ完整=${a.completeCards - b.completeCards}`);
}
await p.close();
await browser.close();
