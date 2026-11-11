// 稳定性：6 个目标案各量 3 次，确认判据不抖（旧判据的原始毛病就是「同页面两次测量选不同元素」）。
import { measure } from '../../74-q7/measure.mjs';
const CASES = [
  ['S01', 'prototypes/S01-red-wedge-broadsheet/index.html'],
  ['S07', 'prototypes/S07-slate-ink-contents/index.html'],
  ['S17', 'prototypes/S17-revenue-stamp-stub/index.html'],
  ['S33', 'prototypes/S33-teal-mirror-ledger/index.html'],
  ['S09', 'prototypes/S09-batik-price-board/index.html'],
  ['S28', 'prototypes/S28-jazz-intaglio-wall/index.html'],
];
for (const [id, f] of CASES) {
  const seen = [];
  for (let i = 0; i < 3; i++) {
    const m = await measure(f);
    seen.push(`${m.gridTracks}|${m.gridSel}|${m.mainRatio.join(',')}`);
  }
  const stable = new Set(seen).size === 1;
  console.log(`${id}  ${stable ? '稳定 ✓' : '抖动 ✗'}  ${seen[0]}`);
  if (!stable) seen.forEach((s) => console.log(`      ${s}`));
}
