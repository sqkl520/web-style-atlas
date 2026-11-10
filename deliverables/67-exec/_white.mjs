// _white.mjs — 只收「纯留白」的组合（不碰字号、不碰内容、不碰家族行数），看能否让最坏的 S13 也进首屏
// 目标：S13（454px）在首卡 top 412.4 下完整（可用 431.6）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const M = () => {
  const rows = [...document.querySelectorAll('.row')];
  const vh = innerHeight;
  const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { id: el.getAttribute('data-id'), top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  const q = (s) => document.querySelector(s);
  const g = (s) => { const e = q(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  return { firstId: boxes[0].id, firstTop: boxes[0].top,
    complete: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    slack: +(vh - (boxes[0].top + boxes[0].h)).toFixed(1),
    maxH: Math.max(...boxes.map((b) => b.h)),
    mastH: g('.mast'), railH: g('.rail'), barH: g('.bar'),
    minFont: Math.min(...[...document.querySelectorAll('.row *, .mast *')].map((e) => parseFloat(getComputedStyle(e).fontSize)).filter((n) => n > 0)),
    famLen: q('.row .row-family').textContent.replace(/\s+/g, '').length };
};

const TRIALS = {
  'X0 现状': '',
  'X1 main pad-top 16→10': `.main{padding-top:10px}`,
  'X2 X1 + mast 8/6→6/4': `.main{padding-top:10px}.mast{padding:6px var(--pad) 4px}`,
  'X3 X2 + row pad 8→6 gap 10→8': `.main{padding-top:10px}.mast{padding:6px var(--pad) 4px}.row{padding:6px 0;gap:8px}`,
  'X4 X3 + foot lh 1.45': `.main{padding-top:10px}.mast{padding:6px var(--pad) 4px}.row{padding:6px 0;gap:8px}.row-foot{line-height:1.45}`,
  'X5 X4 + 图 168': `.main{padding-top:10px}.mast{padding:6px var(--pad) 4px}.row{padding:6px 0;gap:8px}.row-foot{line-height:1.45}.shots .shot:first-child{max-width:168px}`,
  'X6 X4 + 图 172': `.main{padding-top:10px}.mast{padding:6px var(--pad) 4px}.row{padding:6px 0;gap:8px}.row-foot{line-height:1.45}.shots .shot:first-child{max-width:172px}`,
  'X7 X5 + meta gap 3→2': `.main{padding-top:10px}.mast{padding:6px var(--pad) 4px}.row{padding:6px 0;gap:8px}.row-foot{line-height:1.45}.shots .shot:first-child{max-width:168px}.row-meta{gap:2px 8px}`,
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true, reducedMotion: true });
for (const [tag, css] of Object.entries(TRIALS)) {
  await p.goto(SRC, { settleMs: 1250 });
  if (css) await p.eval((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, css);
  await p.eval(() => { const sel = document.getElementById('sort'); sel.value = 'gate'; sel.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(250);
  const m = await p.eval(M);
  console.log(`${tag.padEnd(34)} 首卡=${m.firstId} top=${m.firstTop} 最高=${String(m.maxH).padStart(6)} 完整=${m.complete} 余=${String(m.slack).padStart(6)} ${m.complete >= 1 ? '✓' : '✗'} mast=${m.mastH} bar=${m.barH} 字号下限=${m.minFont} fam=${m.famLen}`);
}
await p.close();
await browser.close();
