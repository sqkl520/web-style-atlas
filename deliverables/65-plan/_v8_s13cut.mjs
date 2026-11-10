// 裁决 2：S13 污染的最小剥离方案——验证它只影响 S13、且不碰 layout
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const t = readFileSync(resolve('prototypes/_selection/data.js'), 'utf8');
const rows = JSON.parse(t.slice(t.indexOf('= ') + 2).replace(/;\s*$/, ''));

const MARK = /反套路改造三指标/;
console.log('=== 「反套路改造三指标」出现在哪些字段（全库 33 键 × 30 案）===');
let hits = 0;
for (const r of rows) {
  for (const [k, v] of Object.entries(r)) {
    if (typeof v === 'string' && MARK.test(v)) { console.log(`  ${r.id}.${k} (${v.length} 字) 位置 ${v.search(MARK)}`); hits++; }
  }
}
console.log('命中字段数:', hits);

// 剥离方案 A：在 audit 里遇到该标记就截断
const cutA = (a) => {
  const i = a.search(MARK);
  return i < 0 ? a : a.slice(0, i).trim();
};
console.log('\n=== 方案 A：audit 在该标记处截断 ===');
let changed = 0, before = 0, after = 0;
for (const r of rows) {
  const n = cutA(r.audit || '');
  before += (r.audit || '').length; after += n.length;
  if (n !== r.audit) { changed++; console.log(`  ${r.id}: ${r.audit.length} → ${n.length} （剥离 ${r.audit.length - n.length} 字）`); }
}
console.log(`受影响案数: ${changed}/30 ｜ audit 合计 ${before} → ${after}`);

// 验证 S13 剥离后是否落在「正常」区间
const lens = rows.map((r) => cutA(r.audit || '').length).sort((a, b) => a - b);
console.log('剥离后长度 min/p50/max:', lens[0], lens[15], lens[29]);
const s13 = rows.find((r) => r.id === 'S13');
console.log('\nS13 剥离后（' + cutA(s13.audit).length + ' 字）:');
console.log(cutA(s13.audit));

// 方案 A 是否动到 layout
console.log('\n=== 方案 A 是否影响 layout / 其他字段 ===');
const L0 = rows.reduce((a, r) => a + (r.layout || '').length, 0);
console.log('layout 合计不变（本方案只作用于 audit）:', L0);

// 被剥离的 473 字该去哪：验证它就是 exec 说的「3-附」
const tail = s13.audit.slice(s13.audit.search(MARK));
console.log('\n被剥离的尾部（' + tail.length + ' 字）前 120 字:');
console.log(tail.slice(0, 120));
console.log('\n=== 结论：这 473 字是否含「用户可用」的设计参数 ===');
for (const re of [/135°/, /0\.4mm/, /120ms/, /0\.8px/, /14%/, /3%/, /border-radius/, /V-11/, /R-40/, /打勾/]) {
  console.log(`  ${String(re).padEnd(16)} ${re.test(tail) ? '有' : '—'}`);
}
