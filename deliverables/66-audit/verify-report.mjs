// verify-report.mjs — 逐条核对报告里的数字
import { readFileSync } from 'node:fs';
const rd = (f) => JSON.parse(readFileSync(new URL('./' + f, import.meta.url), 'utf8'));
const d = rd('data-m32-definitive.json');

console.log('=== 详情 R2 逐案降幅');
const rows = Object.keys(d.detail['390']).sort().map((id) => {
  const a = d.detail['390'][id]['B0 现状'].scrollH, b = d.detail['390'][id]['B1 推荐'].scrollH;
  return { id, a, b, d: b - a, pct: (b - a) / a * 100 };
});
rows.forEach((r) => console.log(` ${r.id} ${r.a} → ${r.b}  ${r.pct.toFixed(1)}%`));
console.log(` 降幅区间 ${Math.min(...rows.map((r) => r.pct)).toFixed(1)}% … ${Math.max(...rows.map((r) => r.pct)).toFixed(1)}%`);
console.log(` 平均降幅 ${(rows.reduce((s, r) => s + r.pct, 0) / 30).toFixed(1)}%`);
const A = rows.map((r) => r.a), B = rows.map((r) => r.b);
console.log(` 现状 ${Math.min(...A)}–${Math.max(...A)} avg ${Math.round(A.reduce((x, y) => x + y, 0) / 30)}`);
console.log(` 推荐 ${Math.min(...B)}–${Math.max(...B)} avg ${Math.round(B.reduce((x, y) => x + y, 0) / 30)}`);
console.log(` 总降 ${Math.round(B.reduce((x, y) => x + y, 0) - A.reduce((x, y) => x + y, 0))} / ${((B.reduce((x, y) => x + y, 0) - A.reduce((x, y) => x + y, 0)) / A.reduce((x, y) => x + y, 0) * 100).toFixed(1)}%`);

console.log('\n=== 屏数');
const scr = (k) => rows.map((r) => d.detail['390'][r.id][k].screens);
console.log(' 现状 max', Math.max(...scr('B0 现状')), 'min', Math.min(...scr('B0 现状')));
console.log(' 推荐 max', Math.max(...scr('B1 推荐')), 'min', Math.min(...scr('B1 推荐')));

console.log('\n=== 首屏完整字段');
const ff = (k) => rows.map((r) => d.detail['390'][r.id][k].fieldsFully);
console.log(' 现状 avg', (ff('B0 现状').reduce((a, b) => a + b, 0) / 30).toFixed(2));
console.log(' 推荐 avg', (ff('B1 推荐').reduce((a, b) => a + b, 0) / 30).toFixed(2));

console.log('\n=== fs / lh / textW');
for (const k of ['B0 现状', 'B1 推荐']) {
  const x = d.detail['390'].S01[k];
  console.log(` ${k}: fs=${x.fs} lh=${x.lh} textW=${x.textW} fieldsH=${x.fieldsH} fieldCount=${x.fieldCount}`);
}

console.log('\n=== 列表 A5');
for (const vp of ['390', '414', '1440']) {
  const a = d.list[vp]['A5 A4+行卡收紧（推荐）'];
  console.log(` ${vp}: mast=${a.mastH} rail=${a.railH} bar=${a.barH} 首卡 ${a.firstRowTop}–${a.firstRowBottom} 完整=${a.complete} 可见=${a.firstVisiblePct}% 余量=${(a.vh - a.firstRowBottom).toFixed(1)} ovX=${a.overflowX} 脚注完整=${a.footFull}`);
}
console.log('\n=== 列表 A0 vs A5 delta 390');
const a0 = d.list['390']['A0 现状'], a5 = d.list['390']['A5 A4+行卡收紧（推荐）'];
console.log(` 首卡 ${a0.firstRowTop} → ${a5.firstRowTop} (Δ ${(a5.firstRowTop - a0.firstRowTop).toFixed(1)})`);
