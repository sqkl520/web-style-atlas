// _side390.mjs — 390 档把缩略图从「文字下方」改成「文字右侧」：省下的不是图高而是整块堆叠
// 现在 .row 在 ≤980 是两列（46px + 1fr），.shots 与 .row-foot 都跨到第 2 列 ⇒ 三段纵向堆叠。
// 改成三列（46 / 文字 / 图），图与文字并排，.row-foot 仍跨底。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HDR = `
  .mast-facts{gap:2px 10px;flex-wrap:nowrap}
  .mast-facts>div{flex:0 1 auto;min-width:0}
  .mast-facts dt{font-size:12px}
  .mast-facts dd{font-size:15px}
  .mast-wizard a{line-height:1.35}
  .mast{padding:8px var(--pad) 6px}
`;

const M = () => {
  const q = (s) => document.querySelector(s);
  const h = (s) => { const e = q(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  const rows = [...document.querySelectorAll('.row')];
  const vh = innerHeight;
  const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  const r0 = rows[0]; const rel = (s) => { const e = r0.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { h: +b.height.toFixed(1), w: +b.width.toFixed(1) }; };
  return { mastH: h('.mast'), barH: h('.bar'),
    firstRowTop: boxes[0]?.top, firstRowH: boxes[0]?.h,
    completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    fitSlack: boxes[0] ? +(vh - (boxes[0].top + boxes[0].h)).toFixed(1) : null,
    maxRowH: Math.max(...boxes.map((b) => b.h)), avgRowH: +(boxes.reduce((a, b) => a + b.h, 0) / boxes.length).toFixed(1),
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    head: rel('.row-head'), meta: rel('.row-meta'), shots: rel('.shots'), img: rel('.shots .shot:first-child img'),
    main: rel('.row-main'), foot: rel('.row-foot'),
    famLen: q('.row .row-family')?.textContent.replace(/\s+/g, '').length };
};

const side = (imgW, cols) => `
  .row { grid-template-columns: 46px minmax(0,1fr) ${imgW}px; }
  .row-main { grid-column: 2; grid-row: 1; }
  .shots { grid-column: 3; grid-row: 1; align-self: start; }
  .shots .shot:first-child { max-width: none; }
  .shots .shot img { max-height: none; }
  .row-foot { grid-column: 2 / -1; }
`;

const TRIALS = {
  'S0 现状（堆叠, 图200）': HDR,
  'S1 并排 图120': HDR + side(120),
  'S2 并排 图132': HDR + side(132),
  'S3 并排 图144': HDR + side(144),
  'S4 并排 图132 + foot lh1.5': HDR + side(132) + `.row-foot{line-height:1.5}`,
  'S5 并排 图120 + foot lh1.5': HDR + side(120) + `.row-foot{line-height:1.5}`,
  'S6 堆叠 图176 + foot lh1.5': HDR + `.shots .shot:first-child{max-width:176px}.row-foot{line-height:1.5}`,
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true, reducedMotion: true });
for (const [tag, css] of Object.entries(TRIALS)) {
  await p.goto(SRC, { settleMs: 1200 });
  await p.eval((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, css);
  await sleep(200);
  const m = await p.eval(M);
  const ok = m.firstRowTop <= 600 && m.completeCards >= 1;
  console.log(`${tag.padEnd(28)} 首卡=${String(m.firstRowTop).padStart(6)} 卡高=${String(m.firstRowH).padStart(6)} 最高=${String(m.maxRowH).padStart(6)} 均=${String(m.avgRowH).padStart(6)} 完整=${m.completeCards} 余=${String(m.fitSlack).padStart(6)} ${ok ? '✓' : '✗'} ovX=${m.overflowX}`);
  console.log(`      head=${m.head?.h}(${m.head?.w}w) meta=${m.meta?.h} shots=${m.shots?.h}(${m.shots?.w}w) img=${m.img?.w}x${m.img?.h} foot=${m.foot?.h} fam=${m.famLen}`);
}
await p.close();
await browser.close();
