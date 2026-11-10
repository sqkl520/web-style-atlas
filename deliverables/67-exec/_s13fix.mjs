// _s13fix.mjs — 让 S13（454px，最坏案）也能完整进首屏，需要再挤 22.4px（含 1px 取整余量）
// S13 比 S01 多花的钱是**真实的**：WARN 5 条（S01 4 条）→ 行脚注 5 行 vs 4 行 = +19.5；
// 家族 213 字 vs 147 字 → 虽然都 clamp 2 行，但 meta 行 grew 65.4 → 89.5（+24.1）。
// 候选都只动留白/行高/图宽，不删字。
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
  const first = boxes[0];
  return { firstId: first.id, firstTop: first.top, firstH: first.h,
    complete: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    slack: +(vh - (first.top + first.h)).toFixed(1),
    maxH: Math.max(...boxes.map((b) => b.h)),
    fitsAll: boxes.every((b) => b.h <= vh - first.top + 0.5),
    // 内容哨兵
    footLen: [...document.querySelectorAll('.row-foot')].map((e) => e.textContent.replace(/\s+/g, '').length).slice(0, 3),
    familyLen: document.querySelector('.row .row-family').textContent.replace(/\s+/g, '').length,
    minFont: Math.min(...[...document.querySelectorAll('.row *')].map((e) => parseFloat(getComputedStyle(e).fontSize)).filter((n) => n > 0)) };
};

const TRIALS = {
  'W0 现状（S01 余 21.1 / S13 差 22.4）': '',
  'W1 图 176→160': `.shots .shot:first-child{max-width:160px}`,
  'W2 foot lh 1.5→1.4': `.row-foot{line-height:1.4}`,
  'W3 W1+W2': `.shots .shot:first-child{max-width:160px}.row-foot{line-height:1.4}`,
  'W4 row pad 8→6 + gap 10→8': `.row{padding:6px 0;gap:8px}`,
  'W5 W3+W4': `.shots .shot:first-child{max-width:160px}.row-foot{line-height:1.4}.row{padding:6px 0;gap:8px}`,
  'W6 W4 + family 1 行': `.row{padding:6px 0;gap:8px}.row-family{-webkit-line-clamp:1}`,
  'W7 family 1 行 + 图 176': `.row-family{-webkit-line-clamp:1}`,
  'W8 W2 + row pad 6 + gap 8': `.row-foot{line-height:1.4}.row{padding:6px 0;gap:8px}`,
  'W9 图 168 + lh1.45 + pad6/gap8': `.shots .shot:first-child{max-width:168px}.row-foot{line-height:1.45}.row{padding:6px 0;gap:8px}`,
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true, reducedMotion: true });
for (const [tag, css] of Object.entries(TRIALS)) {
  await p.goto(SRC, { settleMs: 1250 });
  if (css) await p.eval((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, css);
  // 切到 gate 排序让 S13 当首卡（最坏情况）
  await p.eval(() => { const sel = document.getElementById('sort'); sel.value = 'gate'; sel.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(250);
  const m = await p.eval(M);
  const ok = m.complete >= 1;
  console.log(`${tag.padEnd(36)} 首卡=${m.firstId} h=${String(m.firstH).padStart(6)} 最高=${String(m.maxH).padStart(6)} 完整=${m.complete} 余=${String(m.slack).padStart(6)} ${ok ? '✓' : '✗'} 最小字号=${m.minFont}`);
}
await p.close();
await browser.close();
