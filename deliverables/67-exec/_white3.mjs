// _white3.mjs — 在 Y6（纯留白）基础上配不同图宽，找「30 案全部能完整进首屏」且余量够厚的那一档
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const WS = `.main{padding-top:10px}
  .mast{padding:6px var(--pad) 4px}
  .row{padding:6px 0;gap:8px}
  .row-foot{line-height:1.45;gap:2px 8px}
  .row-meta{gap:2px 8px}`;

const MEAS = (sort) => {
  const sel = document.getElementById('sort');
  if (sel.value !== sort) { sel.value = sort; sel.dispatchEvent(new Event('change', { bubbles: true })); }
  const vh = innerHeight;
  const rows = [...document.querySelectorAll('.row')];
  const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { id: el.getAttribute('data-id'), top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  const top = boxes[0].top;
  return { firstId: boxes[0].id, top,
    complete: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    worstSlack: Math.min(...boxes.map((b) => vh - top - b.h)),
    maxH: Math.max(...boxes.map((b) => b.h)),
    failIds: boxes.filter((b) => b.h > vh - top).map((b) => b.id + ':' + b.h) };
};

const TRIALS = {};
for (const img of [176, 168, 160, 152]) {
  TRIALS[`img=${img}`] = WS + `.shots .shot:first-child{max-width:${img}px}`;
}

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true, reducedMotion: true });
for (const [tag, css] of Object.entries(TRIALS)) {
  await p.goto(SRC, { settleMs: 1250 });
  await p.eval((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, css);
  await sleep(200);
  const n = await p.eval(MEAS, 'n');
  const g = await p.eval(MEAS, 'gate');
  console.log(`${tag.padEnd(12)} top(首卡)=${n.top} | 默认 ${n.firstId} 完整=${n.complete} 最坏余量=${n.worstSlack.toFixed(1)} | gate ${g.firstId} 完整=${g.complete} 最坏余量=${g.worstSlack.toFixed(1)} | 最高卡=${n.maxH} 不合格=${n.failIds.join(',') || '无'}`);
}
await p.close();
await browser.close();
