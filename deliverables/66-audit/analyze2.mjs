// analyze2.mjs — 复核「字段本体占 81–84%」：字段区内部拆解 + 最长 3 字段占比 + 排版可回收量
import { readFileSync } from 'node:fs';
const m2 = JSON.parse(readFileSync(new URL('./data-m2-detail.json', import.meta.url), 'utf8'));
const m8 = JSON.parse(readFileSync(new URL('./data-m8-fields-decomp.json', import.meta.url), 'utf8'));
const m9 = JSON.parse(readFileSync(new URL('./data-m9-typography.json', import.meta.url), 'utf8'));

const v = m2.vps['390'];
console.log('=== 390 字段区内部（S01/S08/S13/S15/S26 逐项实测，m8）');
for (const id of ['S01', 'S08', 'S13', 'S15', 'S26']) {
  const s = m8['390'][id];
  const normal = s.rows.filter((r) => r.implied >= 0);
  const labels = +s.rows.reduce((a, r) => a + r.labH, 0).toFixed(1);
  const pad = +s.rows.reduce((a, r) => a + r.pad, 0).toFixed(1);
  const border = +s.rows.reduce((a, r) => a + r.border, 0).toFixed(1);
  const text = +(s.dlH - labels - pad - border).toFixed(1);
  console.log(` ${id} 字段区=${s.dlH} = 正文 ${text} (${(text / s.dlH * 100).toFixed(1)}%) + 标签 ${labels} (${(labels / s.dlH * 100).toFixed(1)}%) + 内距 ${pad} (${(pad / s.dlH * 100).toFixed(1)}%) + 分隔线 ${border}`);
}

console.log('\n=== 390 每案「最长 3 个字段」占字段区多少');
const rows = v.map((c) => {
  const fs = c.fields.map((f) => ({ label: f.label.replace(/（.*/, ''), h: f.h })).sort((a, b) => b.h - a.h);
  const top3 = fs.slice(0, 3).reduce((a, b) => a + b.h, 0);
  return {
    id: c.id, fieldsH: c.fieldsDl.h, top3: +top3.toFixed(1), pct: +(top3 / c.fieldsDl.h * 100).toFixed(1),
    names: fs.slice(0, 3).map((f) => f.label).join('/'),
  };
});
rows.forEach((r) => console.log(` ${r.id} 字段区=${String(r.fieldsH).padStart(7)} 最长3=${String(r.top3).padStart(6)} ${String(r.pct).padStart(5)}%  ${r.names}`));
const avgPct = rows.reduce((a, b) => a + b.pct, 0) / 30;
console.log(` 平均 ${avgPct.toFixed(1)}%  最小 ${Math.min(...rows.map((r) => r.pct))}%  最大 ${Math.max(...rows.map((r) => r.pct))}%`);

console.log('\n=== 排版可回收量（390，30 案，m9）');
const ids = Object.keys(m9.data);
const base = ids.map((id) => m9.data[id].T0.scrollH);
for (const k of Object.keys(m9.defs)) {
  const a = ids.map((id) => m9.data[id][k].scrollH);
  const d = a.map((x, i) => x - base[i]);
  console.log(` ${k} ${m9.defs[k]}`);
  console.log(`     min=${Math.min(...a)} max=${Math.max(...a)} avg=${Math.round(a.reduce((p, q) => p + q, 0) / 30)} ≤3800=${a.filter((x) => x <= 3800).length}/30 平均省 ${Math.round(d.reduce((p, q) => p + q, 0) / 30)}px (${(d.reduce((p, q) => p + q, 0) / base.reduce((p, q) => p + q, 0) * 100).toFixed(1)}%)`);
}

console.log('\n=== 中文字符数 vs scrollHeight（判断"内容长度"是否成立）');
const allChars = v.map((c) => c.totalChars);
console.log(' 每案字段总字数 min/max/avg', Math.min(...allChars), Math.max(...allChars), Math.round(allChars.reduce((a, b) => a + b, 0) / 30));
console.log(' scrollHeight/字数 比值（390）', (v.reduce((a, c) => a + c.detail.scrollHeight, 0) / allChars.reduce((a, b) => a + b, 0)).toFixed(3));
const v1440 = m2.vps['1440'];
const chars1440 = v1440.map((c) => c.totalChars);
console.log(' scrollHeight/字数 比值（1440）', (v1440.reduce((a, c) => a + c.detail.scrollHeight, 0) / chars1440.reduce((a, b) => a + b, 0)).toFixed(3));
