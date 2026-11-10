// analyze4.mjs — 复核上一轮的两条判断：字段前占比、换行倍数
import { readFileSync } from 'node:fs';
const rd = (f) => JSON.parse(readFileSync(new URL('./' + f, import.meta.url), 'utf8'));
const m2 = rd('data-m2-detail.json');
const m8 = rd('data-m8-fields-decomp.json');

console.log('=== 390 每案「字段之前」占比');
const rows = m2.vps['390'].map((c) => {
  const foldSum = c.folds.reduce((a, b) => a + b.h, 0);
  const before = c.fieldsDl.top;
  return { id: c.id, sh: c.detail.scrollHeight, before, pct: before / c.detail.scrollHeight * 100 };
});
rows.forEach((r) => console.log(` ${r.id} 字段前=${String(r.before).padStart(6)} / ${r.sh} = ${r.pct.toFixed(1)}%`));
console.log(` 平均 ${(rows.reduce((a, b) => a + b.pct, 0) / 30).toFixed(1)}%  区间 ${Math.min(...rows.map((r) => r.pct)).toFixed(1)}–${Math.max(...rows.map((r) => r.pct)).toFixed(1)}%`);
console.log(` 字段前平均 ${Math.round(rows.reduce((a, b) => a + b.before, 0) / 30)} px`);

console.log('\n=== 正文宽度对比（同一元素 .field dd）');
for (const vp of ['390', '1440']) {
  const s = m8[vp].S01;
  const textW = s.textWidth, fs = parseFloat(s.fontSize);
  console.log(` ${vp}: 正文宽 ${textW}px, 字号 ${fs}px, 每行约 ${(textW / fs).toFixed(2)} 个全角字`);
}
const s390 = m8['390'].S01, s1440 = m8['1440'].S01;
console.log(` 正文宽比 390/1440 = ${(s390.textWidth / s1440.textWidth).toFixed(3)}`);
console.log(` 正文字区高比（同一案 S01，同样文字）= ${(s390.bodySum / s1440.bodySum).toFixed(3)}`);
console.log(` 字段区总高比 = ${(s390.dlH / s1440.dlH).toFixed(3)}`);

// 逐案：390 正文高 / 1440 正文高
const ratio = m2.vps['390'].map((c) => {
  const a = m2.vps['1440'].find((x) => x.id === c.id);
  return { id: c.id, r: c.fieldsDl.h / a.fieldsDl.h };
});
console.log(` 字段区高 390/1440 比：min ${Math.min(...ratio.map((x) => x.r)).toFixed(2)} max ${Math.max(...ratio.map((x) => x.r)).toFixed(2)} avg ${(ratio.reduce((a, b) => a + b.r, 0) / 30).toFixed(2)}`);

console.log('\n=== 3800 在不同视口代表几屏');
for (const [vp, h] of [['390', 844], ['414', 896], ['1440', 900]]) {
  console.log(` ${vp}×${h}: 3800 / ${h} = ${(3800 / h).toFixed(2)} 屏`);
}
console.log(' 反推：若阈值本意是 4.5 屏 → 390 应为 3798px、414 应为 4032px、1440 应为 4050px');

console.log('\n=== 折叠块 4 个的高度（390，30 案）');
const f = m2.vps['390'];
const foldTotal = f.map((c) => c.folds.reduce((a, b) => a + b.h, 0));
console.log(` 3 个 .fold 合计：${Math.min(...foldTotal)}–${Math.max(...foldTotal)}（恒定）`);
const auditFold = f.map((c) => c.fields.find((x) => x.isFold).h);
console.log(` 第 4 个（去 AI 味审查点，在 .fields 内）：${Math.min(...auditFold)}–${Math.max(...auditFold)}`);
console.log(` 4 块合计 ${Math.min(...foldTotal) + Math.min(...auditFold)}–${Math.max(...foldTotal) + Math.max(...auditFold)}`);

console.log('\n=== 展开态成本（m16）');
const m16 = rd('data-m16-readcost.json');
for (const vp of ['390', '414']) {
  for (const id of ['S01', 'S13', 'S26']) {
    const b = m16.data[vp][id].baseline, vg = m16.data[vp][id].VG;
    console.log(` ${vp} ${id}: 现状折叠态 ${b.foldedH} → 全展开 ${b.expandedH}（+${b.expandedH - b.foldedH}，${b.detailCount} 块） | 庚 折叠态 ${vg.foldedH} → 全展开 ${vg.expandedH}（${vg.detailCount} 块）`);
  }
}
