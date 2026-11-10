// _white2.mjs — 只收留白（图宽保持 176，不动字号/内容），精确找 S13 能不能进
// 同时报默认排序（S01）与 gate 排序（S13）两种首卡
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MEAS = (sort) => {
  const sel = document.getElementById('sort');
  if (sel.value !== sort) { sel.value = sort; sel.dispatchEvent(new Event('change', { bubbles: true })); }
  const rows = [...document.querySelectorAll('.row')];
  const vh = innerHeight;
  const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { id: el.getAttribute('data-id'), top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  return { firstId: boxes[0].id, firstTop: boxes[0].top, slack: +(vh - (boxes[0].top + boxes[0].h)).toFixed(1),
    complete: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    maxH: Math.max(...boxes.map((b) => b.h)),
    tallIds: boxes.filter((b) => b.h > 431).map((b) => b.id + ':' + b.h) };
};

const TRIALS = {
  'Y0 现状': '',
  'Y1 pad-top 16→10': `.main{padding-top:10px}`,
  'Y2 Y1 + mast 6/4': `.main{padding-top:10px}.mast{padding:6px var(--pad) 4px}`,
  'Y3 Y2 + row pad 6 gap 8': `.main{padding-top:10px}.mast{padding:6px var(--pad) 4px}.row{padding:6px 0;gap:8px}`,
  'Y4 Y3 + foot lh 1.45': `.main{padding-top:10px}.mast{padding:6px var(--pad) 4px}.row{padding:6px 0;gap:8px}.row-foot{line-height:1.45}`,
  'Y5 Y4 + meta gap2': `.main{padding-top:10px}.mast{padding:6px var(--pad) 4px}.row{padding:6px 0;gap:8px}.row-foot{line-height:1.45}.row-meta{gap:2px 8px}`,
  'Y6 Y5 + foot gap 3→2': `.main{padding-top:10px}.mast{padding:6px var(--pad) 4px}.row{padding:6px 0;gap:8px}.row-foot{line-height:1.45;gap:2px 8px}.row-meta{gap:2px 8px}`,
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true, reducedMotion: true });
for (const [tag, css] of Object.entries(TRIALS)) {
  await p.goto(SRC, { settleMs: 1250 });
  if (css) await p.eval((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, css);
  await sleep(200);
  const a = await p.eval(MEAS, 'n');
  const b = await p.eval(MEAS, 'gate');
  console.log(`${tag.padEnd(28)} 默认: ${a.firstId} top=${a.firstTop} 余=${String(a.slack).padStart(6)} 完整=${a.complete} | gate: ${b.firstId} 余=${String(b.slack).padStart(6)} 完整=${b.complete} | 最高=${b.maxH} 超431的案=${b.tallIds.join(',') || '无'}`);
}
await p.close();
await browser.close();
