// _final390.mjs — 定稿：390 档最终一组数值，确认余量 ≥15px 且内容零删减
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
  return { mastH: h('.mast'), railH: h('.rail'), barH: h('.bar'),
    firstRowTop: boxes[0]?.top, firstRowH: boxes[0]?.h,
    completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    fitSlack: boxes[0] ? +(vh - (boxes[0].top + boxes[0].h)).toFixed(1) : null,
    maxRowH: Math.max(...boxes.map((b) => b.h)),
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    famLen: q('.row .row-family')?.textContent.replace(/\s+/g, '').length,
    footLen: q('.row .row-foot')?.textContent.replace(/\s+/g, '').length,
    footLines: Math.round(q('.row .row-foot').getBoundingClientRect().height / parseFloat(getComputedStyle(q('.row .row-foot')).lineHeight)) };
};

const F = `
  .mast { padding: 8px var(--pad) 6px; }
  .mast-wizard a { line-height: 1.35; }
  .mast-facts { gap: 2px 10px; flex-wrap: nowrap; }
  .mast-facts > div { flex: 0 1 auto; min-width: 0; }
  .mast-facts dt { font-size: 12px; }
  .mast-facts dd { font-size: 15px; }
  .rail { padding: 0 var(--pad) 2px; }
  .bar { padding-bottom: 6px; }
  .search input { padding: 5px 10px; }
  .shots .shot:first-child { max-width: 176px; }
  .row-foot { line-height: 1.5; }
`;

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true, reducedMotion: true });
for (const vp of [{ k: '390', w: 390, h: 844, d: 2, m: true }, { k: '414', w: 414, h: 896, d: 2, m: true }, { k: '768', w: 768, h: 1024, d: 1, m: false }, { k: '1440', w: 1440, h: 900, d: 1, m: false }]) {
  await p.setViewport({ width: vp.w, height: vp.h, dsf: vp.d, mobile: vp.m });
  await p.goto(SRC, { settleMs: 1500 });
  const before = await p.eval(M);
  await p.eval((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, F);
  await sleep(250);
  const after = await p.eval(M);
  console.log(`\n[${vp.k}]  改前 首卡=${before.firstRowTop} 卡高=${before.firstRowH} 完整=${before.completeCards}`);
  console.log(`        改后 首卡=${after.firstRowTop} 卡高=${after.firstRowH} 最高=${after.maxRowH} 完整=${after.completeCards} 余=${after.fitSlack} ovX=${after.overflowX}`);
  console.log(`        mast=${after.mastH} rail=${after.railH} bar=${after.barH} fam=${after.famLen} foot=${after.footLen}(${after.footLines}行)`);
}
await p.close();
await browser.close();
