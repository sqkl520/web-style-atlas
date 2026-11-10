// _probe-reveal.mjs — 决定性问题：关闭态 <details> 的正文能否被**作者样式**在宽档展开，
// 且展开后 .mast 高度回到改动前的 304.0px（±0.5）。
// 测 4 种机制：
//   M1 子元素 display:block
//   M2 details::details-content { content-visibility: visible !important }
//   M3 两者都上
//   M4 details { display: contents } + summary display:none + M2
// 同时看 390 档（不应用展开样式时）是否真的折起来。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 把 claim + exit 折进一个 details，返回该 details 的 id
const FOLD = `
  var claim = document.querySelector('.mast-claim');
  var exit  = document.querySelector('.mast-exit');
  var d = document.createElement('details');
  d.id = 'probe-mast-fold';
  d.className = 'probe-fold';
  var s = document.createElement('summary');
  s.textContent = '这个图集是什么 · 想要现成模板去哪';
  s.style.cssText = 'min-height:44px;display:flex;align-items:center;font-size:14px;padding:8px 0;cursor:pointer;font-weight:600';
  claim.parentNode.insertBefore(d, claim);
  d.appendChild(s); d.appendChild(claim); d.appendChild(exit);
  d.open = false;
`;

const MECHS = {
  M0: { label: '不展开（折起基线）', css: '' },
  M1: { label: '子元素 display:block', css: `
      .probe-fold > .mast-claim, .probe-fold > .mast-exit { display: block; }` },
  M2: { label: '::details-content content-visibility:visible', css: `
      .probe-fold::details-content { content-visibility: visible !important; }` },
  M3: { label: 'M1 + M2', css: `
      .probe-fold::details-content { content-visibility: visible !important; }
      .probe-fold > .mast-claim, .probe-fold > .mast-exit { display: block; }` },
  M4: { label: 'details{display:contents} + summary:none + M2', css: `
      .probe-fold { display: contents; }
      .probe-fold > summary { display: none; }
      .probe-fold::details-content { content-visibility: visible !important; }` },
};

const MEASURE = () => {
  const q = (s) => document.querySelector(s);
  const box = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1) }; };
  const rows = [...document.querySelectorAll('.row')];
  const vh = innerHeight;
  const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, h: b.height }; });
  const vis = (el) => { if (!el) return null; return el.checkVisibility ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : null; };
  return {
    mastH: box(q('.mast'))?.h,
    claim: box(q('.mast-claim')), exit: box(q('.mast-exit')),
    claimVisible: vis(q('.mast-claim')), exitVisible: vis(q('.mast-exit')),
    exitTextLen: (q('.mast-exit')?.textContent || '').replace(/\s+/g, '').length,
    summaryDisplay: q('#probe-mast-fold > summary') ? getComputedStyle(q('#probe-mast-fold > summary')).display : null,
    detailsOpen: q('#probe-mast-fold')?.open,
    firstRowTop: boxes[0] ? +boxes[0].top.toFixed(1) : null,
    completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const vp of [{ k: '1440', w: 1440, h: 900, dsf: 1, mobile: false }, { k: '390', w: 390, h: 844, dsf: 2, mobile: true }]) {
  out[vp.k] = {};
  for (const [mk, mech] of Object.entries(MECHS)) {
    const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: vp.dsf, mobile: vp.mobile });
    await p.goto(PAGE, { settleMs: 1500 });
    const before = await p.eval(MEASURE);
    await p.eval((code) => { new Function(code)(); }, FOLD);
    if (mech.css) await p.eval((css) => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }, mech.css);
    await sleep(200);
    const after = await p.eval(MEASURE);
    out[vp.k][mk] = { label: mech.label, mastBefore: before.mastH, ...after };
    console.log(`[${vp.k}] ${mk} ${mech.label}`);
    console.log(`      mast ${before.mastH} -> ${after.mastH} | claim h=${after.claim?.h} vis=${after.claimVisible} exit h=${after.exit?.h} vis=${after.exitVisible} len=${after.exitTextLen}`);
    console.log(`      summary=${after.summaryDisplay} firstRow=${after.firstRowTop} (before ${before.firstRowTop}) 完整卡=${after.completeCards} ovX=${after.overflowX}`);
    await p.close();
  }
}
writeFileSync(join(HERE, 'data-67-reveal.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('\nwritten data-67-reveal.json');
