// _tune390.mjs — 定 390 档最后那 26.7px：在**改后源码**上逐项试，每项单独量增量
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
    wizardH: h('.mast-wizard a'), footH: h('.row-foot'), headH: h('.row-head'),
    firstRowTop: boxes[0]?.top, firstRowH: boxes[0]?.h,
    completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    fitSlack: boxes[0] ? +(vh - (boxes[0].top + boxes[0].h)).toFixed(1) : null,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true, reducedMotion: true });
await p.goto(SRC, { settleMs: 1700 });
const base = await p.eval(M);
console.log('改后源码基线:', JSON.stringify(base));

const TRIALS = {
  'T0 基线': '',
  'T1 facts gap 14→10': `.mast-facts{gap:2px 10px}`,
  'T2 facts gap 14→8': `.mast-facts{gap:2px 8px}`,
  'T3 mast padding 12/8→8/6': `.mast{padding:8px var(--pad) 6px}`,
  'T4 wizard a line-height 1.35': `.mast-wizard a{line-height:1.35}`,
  'T5 组合 T1+T3+T4': `.mast-facts{gap:2px 10px}.mast{padding:8px var(--pad) 6px}.mast-wizard a{line-height:1.35}`,
  'T6 T5 + search 内距 7→5': `.mast-facts{gap:2px 10px}.mast{padding:8px var(--pad) 6px}.mast-wizard a{line-height:1.35}.search input{padding:5px 10px}`,
  'T7 T6 + bar gap 8→6 + bsum 34→32': `.mast-facts{gap:2px 10px}.mast{padding:8px var(--pad) 6px}.mast-wizard a{line-height:1.35}.search input{padding:5px 10px}.bar{gap:6px 10px}.bar-fold-sum{min-height:32px}`,
  'T8 T7 + row-foot gap 3→1': `.mast-facts{gap:2px 10px}.mast{padding:8px var(--pad) 6px}.mast-wizard a{line-height:1.35}.search input{padding:5px 10px}.bar{gap:6px 10px}.bar-fold-sum{min-height:32px}.row-foot{gap:1px 10px}`,
};

for (const [tag, css] of Object.entries(TRIALS)) {
  await p.goto(SRC, { settleMs: 1200 });
  if (css) await p.eval((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, css);
  await sleep(200);
  const m = await p.eval(M);
  const ok = m.firstRowTop <= 600 && m.completeCards >= 1;
  console.log(`${tag.padEnd(34)} mast=${String(m.mastH).padStart(6)} facts=${String(m.factsH).padStart(5)} wiz=${String(m.wizardH).padStart(5)} rail=${String(m.railH).padStart(4)} bar=${String(m.barH).padStart(5)} 首卡=${String(m.firstRowTop).padStart(6)} 卡高=${String(m.firstRowH).padStart(6)} 完整=${m.completeCards} 余=${String(m.fitSlack).padStart(7)} ${ok ? '✓' : '✗'} ovX=${m.overflowX}`);
}
await p.close();
await browser.close();
