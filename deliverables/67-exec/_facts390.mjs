// _facts390.mjs — facts 四个读数在 390 档能不能排成一行（省 26px），以及页头还能收回多少
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true, reducedMotion: true });
await p.goto(SRC, { settleMs: 1700 });

// 先量 facts 每项的天然宽度
const widths = await p.eval(() => {
  const dl = document.querySelector('.mast-facts');
  const items = [...dl.children];
  return { containerW: +dl.getBoundingClientRect().width.toFixed(1),
    items: items.map((d) => ({ w: +d.getBoundingClientRect().width.toFixed(1),
      dt: d.querySelector('dt').textContent, dtW: +d.querySelector('dt').getBoundingClientRect().width.toFixed(1),
      ddW: +d.querySelector('dd').getBoundingClientRect().width.toFixed(1) })),
    rows: new Set(items.map((d) => Math.round(d.getBoundingClientRect().top))).size };
});
console.log('facts 天然宽度:', JSON.stringify(widths, null, 1));

const M = () => {
  const q = (s) => document.querySelector(s);
  const h = (s) => { const e = q(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  const rows = [...document.querySelectorAll('.row')];
  const vh = innerHeight;
  const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  return { mastH: h('.mast'), factsH: h('.mast-facts'), wizardH: h('.mast-wizard a'), barH: h('.bar'),
    factsRows: new Set([...document.querySelectorAll('.mast-facts > div')].map((d) => Math.round(d.getBoundingClientRect().top))).size,
    firstRowTop: boxes[0]?.top, firstRowH: boxes[0]?.h,
    completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    fitSlack: boxes[0] ? +(vh - (boxes[0].top + boxes[0].h)).toFixed(1) : null,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
};

const FACTS1 = `.mast-facts{gap:2px 10px;flex-wrap:nowrap}
  .mast-facts>div{flex:0 1 auto;min-width:0}
  .mast-facts dt{font-size:12px}
  .mast-facts dd{font-size:15px}`;

const TRIALS = {
  'V0 基线': '',
  'V1 facts 一行(12/15px,gap10)': FACTS1,
  'V2 V1 + wizard lh1.35': FACTS1 + `.mast-wizard a{line-height:1.35}`,
  'V3 V2 + mast pad 8/6': FACTS1 + `.mast-wizard a{line-height:1.35}.mast{padding:8px var(--pad) 6px}`,
  'V4 V3 + bar pad 8→6': FACTS1 + `.mast-wizard a{line-height:1.35}.mast{padding:8px var(--pad) 6px}.bar{padding-bottom:6px}`,
  'V5 V3 + 图 176': FACTS1 + `.mast-wizard a{line-height:1.35}.mast{padding:8px var(--pad) 6px}.shots .shot:first-child{max-width:176px}`,
  'V6 V3 + 图 184': FACTS1 + `.mast-wizard a{line-height:1.35}.mast{padding:8px var(--pad) 6px}.shots .shot:first-child{max-width:184px}`,
  'V7 V3 + 图 192': FACTS1 + `.mast-wizard a{line-height:1.35}.mast{padding:8px var(--pad) 6px}.shots .shot:first-child{max-width:192px}`,
  'V8 V3 + 图 200（不动图）': FACTS1 + `.mast-wizard a{line-height:1.35}.mast{padding:8px var(--pad) 6px}`,
};

for (const [tag, css] of Object.entries(TRIALS)) {
  await p.goto(SRC, { settleMs: 1200 });
  if (css) await p.eval((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, css);
  await sleep(200);
  const m = await p.eval(M);
  const ok = m.firstRowTop <= 600 && m.completeCards >= 1;
  console.log(`${tag.padEnd(32)} mast=${String(m.mastH).padStart(6)} facts=${String(m.factsH).padStart(5)}(r${m.factsRows}) wiz=${String(m.wizardH).padStart(5)} bar=${String(m.barH).padStart(5)} 首卡=${String(m.firstRowTop).padStart(6)} 卡高=${String(m.firstRowH).padStart(6)} 完整=${m.completeCards} 余=${String(m.fitSlack).padStart(6)} ${ok ? '✓' : '✗'} ovX=${m.overflowX}`);
}
await p.close();
await browser.close();
