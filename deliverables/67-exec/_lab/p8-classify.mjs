// p8-classify.mjs — 390 档垂直空间三分类（2026-10-28）。
// 分类口径（写进交付物那张表的定义）：
//   必须保留  = 正文 dd 的高度（16px/1.62，一个字都不许动）
//   可适度压  = 标签 dt、卡片内距、折叠条 summary、面板 padding —— 有排版余量的部分
//   纯浪费    = 能折起来的正文（本轮折掉的 4 段），以及折叠后省下的高度
// 数字全部来自 p1-baseline（改前）与 p4-accept（改后），这里只做汇总与校验。
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE } from './lib.mjs';

const B = JSON.parse(readFileSync(join(HERE, 'p1-baseline.json'), 'utf8')).base['390'];
const A = JSON.parse(readFileSync(join(HERE, 'p4-accept.json'), 'utf8')).vp['390'];

const sum = (arr, f) => arr.reduce((a, b) => a + f(b), 0);
const avg = (arr, f) => +(sum(arr, f) / arr.length).toFixed(1);

// ── 改前 ──
const before = {
  scrollH: avg(B, (r) => r.scrollH),
  fieldsH: avg(B, (r) => r.fieldsH),
  ddH: avg(B, (r) => sum(r.fields, (f) => f.ddH)),
  dtH: avg(B, (r) => sum(r.fields, (f) => f.dtH)),
  padH: avg(B, (r) => sum(r.fields, (f) => f.padT + f.padB)),
  borderH: avg(B, (r) => r.fields.filter((f) => f.label).length),
  chromeH: avg(B, (r) => r.scrollH - r.fieldsH),
  firstFieldTop: avg(B, (r) => r.firstFieldTop),
};

// 折掉的 4 段正文（改前）与它们折叠后的 summary
const FOLDLAB = ['布局与网格', '可落地要点', '关键视觉元素', '动效与交互'];
const foldedDd = avg(B, (r) => sum(r.fields.filter((f) => FOLDLAB.includes(f.label)), (f) => f.ddH));
const foldedDtH = avg(B, (r) => sum(r.fields.filter((f) => FOLDLAB.includes(f.label)), (f) => f.dtH));
const longSumH = avg(A, (r) => sum(r.extra.longSummaries, (s) => s.h));

// ── 改后 ──
const after = {
  scrollH: avg(A, (r) => r.scrollH),
  firstFieldTop: avg(A, (r) => r.firstFieldTop),
  sumH: longSumH,
  type: A[0].extra.type,
};

const out = { at: new Date().toISOString(), before, after, foldedDd, foldedDtH, longSumH };
out.saved = +(before.scrollH - after.scrollH).toFixed(1);
// 注意：longSumH 是"一案 4 条 summary 合计"（avg of sum），不是单条。
out.foldNet = +(foldedDd + foldedDtH - longSumH).toFixed(1);

console.log('改前 390 平均 scrollHeight     ', before.scrollH);
console.log('  ├ 字段区                     ', before.fieldsH);
console.log('  │   ├ 正文 dd（必须保留）      ', before.ddH);
console.log('  │   ├ 标签 dt（可压）          ', before.dtH);
console.log('  │   ├ 卡片内距 padding（可压） ', before.padH);
console.log('  │   └ 分隔线 border（可压）    ', before.borderH);
console.log('  └ 字段区外 chrome              ', before.chromeH);
console.log('');
console.log('折掉的 4 段正文（可折的纯冗余高度）', foldedDd, '+ 它们的 dt', foldedDtH);
console.log('折叠后 4 条 summary 合计          ', longSumH, '(每条', (longSumH/4).toFixed(1), ')');
console.log('净省                             ', out.foldNet);
console.log('');
console.log('改后 390 平均 scrollHeight     ', after.scrollH, '（−' + out.saved + '）');
console.log('首字段 top                     ', before.firstFieldTop, '→', after.firstFieldTop);
console.log('正文                           ', JSON.stringify(after.type));

writeFileSync(join(HERE, 'p8-classify.json'), JSON.stringify(out, null, 1));
console.log('\nwritten p8-classify.json');
