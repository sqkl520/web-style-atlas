// _tune390b.mjs — 最后 26.7px 的两种取法对比：缩略图 200→160/170，与行脚注行高 1.62→1.5
// 判据：首屏完整卡 ≥1、首卡 top ≤600、无溢出；内容一个不删。
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
  const r0 = rows[0]; const rt = r0.getBoundingClientRect().top;
  const rel = (s) => { const e = r0.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return +(b.height).toFixed(1); };
  return { mastH: h('.mast'), barH: h('.bar'),
    firstRowTop: boxes[0]?.top, firstRowH: boxes[0]?.h,
    completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    fitSlack: boxes[0] ? +(vh - (boxes[0].top + boxes[0].h)).toFixed(1) : null,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    head: rel('.row-head'), foot: rel('.row-foot'), img: rel('.shots .shot:first-child img'),
    footLines: r0.querySelector('.row-foot').getClientRects().length,
    footTextLen: r0.querySelector('.row-foot').textContent.replace(/\s+/g, '').length };
};

const TRIALS = {
  'U0 基线（图 200 宽）': '',
  'U1 图 170 宽': `.shots .shot:first-child{max-width:170px}`,
  'U2 图 160 宽': `.shots .shot:first-child{max-width:160px}`,
  'U3 图 150 宽': `.shots .shot:first-child{max-width:150px}`,
  'U4 foot 行高 1.5': `.row-foot{line-height:1.5}`,
  'U5 foot 行高 1.45': `.row-foot{line-height:1.45}`,
  'U6 U2 + U4': `.shots .shot:first-child{max-width:160px}.row-foot{line-height:1.5}`,
  'U7 U1 + U4': `.shots .shot:first-child{max-width:170px}.row-foot{line-height:1.5}`,
  'U8 U3 + U5': `.shots .shot:first-child{max-width:150px}.row-foot{line-height:1.45}`,
  'U9 图 176 + foot 1.5': `.shots .shot:first-child{max-width:176px}.row-foot{line-height:1.5}`,
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true, reducedMotion: true });
for (const [tag, css] of Object.entries(TRIALS)) {
  await p.goto(SRC, { settleMs: 1200 });
  if (css) await p.eval((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, css);
  await sleep(200);
  const m = await p.eval(M);
  const ok = m.firstRowTop <= 600 && m.completeCards >= 1;
  console.log(`${tag.padEnd(28)} 图=${String(m.img).padStart(5)} head=${String(m.head).padStart(5)} foot=${String(m.foot).padStart(5)} 首卡=${String(m.firstRowTop).padStart(6)} 卡高=${String(m.firstRowH).padStart(6)} 完整=${m.completeCards} 余=${String(m.fitSlack).padStart(6)} ${ok ? '✓' : '✗'} ovX=${m.overflowX}`);
}
await p.close();
await browser.close();
