// _fixbar.mjs — 1440 档让 .bar 回到 59.9px 的几种写法，逐个实测（判据：barH ≈ 59.9 且首卡 top 387.9）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const M = () => {
  const bar = document.querySelector('.bar');
  const items = [...bar.children].filter((e) => getComputedStyle(e).display !== 'none').map((e) => {
    const b = e.getBoundingClientRect();
    return { el: (e.id || e.className || e.tagName) + ':' + getComputedStyle(e).display + ':w' + Math.round(b.width) + ':t' + Math.round(b.top) };
  });
  const bf = document.getElementById('bar-fold');
  const lines = new Set([...bar.querySelectorAll('.search, .count, .sort, #reset')].map((e) => Math.round(e.getBoundingClientRect().top)));
  const rows = [...document.querySelectorAll('.row')];
  return { barH: +bar.getBoundingClientRect().height.toFixed(1), lines: lines.size, items,
    firstRowTop: rows[0] ? +rows[0].getBoundingClientRect().top.toFixed(1) : null,
    bfDisplay: bf ? getComputedStyle(bf).display : null };
};

const TRIALS = {
  'B0 现状 display:contents': '',
  'B1 contents + bar 上 gap 18': `@media (min-width:981px){.bar{gap:12px 18px!important}}`,
  'B2 不包：contents + ::details-content contents': `@media (min-width:981px){
     .bar-fold{display:contents}
     .bar-fold::details-content{display:contents}}`,
  'B3 details 用 flex 自身': `@media (min-width:981px){
     .bar-fold{display:flex;flex:0 0 auto;align-items:center;gap:18px;flex-wrap:nowrap}}`,
  'B4 search 基础宽改小 (320→auto)': `@media (min-width:981px){.search{flex:1 1 240px}}`,
  'B5 contents + search flex 1 1 320 显式': `@media (min-width:981px){.bar-fold{display:contents}.search{flex:1 1 320px}}`,
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 1440, height: 900, reducedMotion: true });
for (const [tag, css] of Object.entries(TRIALS)) {
  await p.goto(SRC, { settleMs: 1200 });
  if (css) await p.eval((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, css);
  await sleep(200);
  const m = await p.eval(M);
  console.log(`${tag.padEnd(38)} barH=${String(m.barH).padStart(5)} 行数=${m.lines} 首卡=${m.firstRowTop} bf=${m.bfDisplay}`);
  console.log(`      ${m.items.join(' | ')}`);
}
await p.close();
await browser.close();
