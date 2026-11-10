// 任务 3 探针 B：核实 U3「数学不可能」在 S28 上是否真的成立 —— 不能对原型做错误指控。
// 签名动作声称：16 栏、12 块、最大 7 栏最小 2 栏。
// U3 候选推理：12 块 × 最小 2 栏 = 24 栏 > 16 栏 → 单行放不下。
// 但这只有在「12 块必须同行」时才矛盾。原型若分多行（多 .row），则完全不矛盾。
// 我必须先数原型到底怎么排。
import { readFileSync, writeFileSync } from 'node:fs';

const H = 'D:/Web/style/prototypes/S28-jazz-intaglio-wall/index.html';
const C = 'D:/Web/style/prototypes/S28-jazz-intaglio-wall/style.css';
const html = readFileSync(H, 'utf8');
const css = readFileSync(C, 'utf8');

// 每个 .row 容器（含 row--4 等修饰）里有多少 blk，span 各是多少
const rows = [...html.matchAll(/<div class="(row[^"]*)"([\s\S]*?)(?=<div class="row[\s"]|<\/section>|<\/main>|$)/g)];
console.log('检测到 row 容器数：', rows.length);
let total = 0;
const detail = [];
for (const r of rows) {
  const spans = [...r[2].matchAll(/blk--s(\d)/g)].map((m) => +m[1]);
  total += spans.length;
  detail.push({ cls: r[1], n: spans.length, spans, sum: spans.reduce((a, b) => a + b, 0) });
  console.log('  ' + r[1].padEnd(16), '块数=' + String(spans.length).padEnd(3), 'span=' + spans.join('+') + ' = ' + spans.reduce((a, b) => a + b, 0));
}
console.log('\n总块数（.row 内）：', total);

// 若不按 row 分，全文档的 blk--sN 计数
const allSpans = [...html.matchAll(/blk--s(\d)/g)].map((m) => +m[1]);
console.log('全文档 blk--sN 出现次数：', allSpans.length, ' 合计 span：', allSpans.reduce((a, b) => a + b, 0));

// CSS 里 .row 的列定义
const rowCss = [...css.matchAll(/\.row[^{]*\{[^}]*\}/g)].map((m) => m[0].replace(/\s+/g, ' ')).slice(0, 4);
console.log('\n.row 的 CSS：');
rowCss.forEach((r) => console.log('  ' + r.slice(0, 150)));

// 结论
const maxSpan = Math.max(...allSpans.filter((x) => x <= 7), 0);
const minSpan = Math.min(...allSpans.filter((x) => x >= 2), 99);
const okSingleRow = allSpans.reduce((a, b) => a + b, 0) <= 16;
console.log('\n最小 span =', minSpan, ' 最大 span =', maxSpan);
console.log('若 12 块排在同一行：合计', allSpans.reduce((a, b) => a + b, 0), '栏，', okSingleRow ? '≤16 可行' : '>16 不可行');
console.log('实际是否多行：', rows.length > 1 ? '是 → 单行容量矛盾不成立' : '否 → 矛盾成立');

writeFileSync('D:/Web/style/deliverables/69-audit/t3-s28-grid.json', JSON.stringify({ rows: detail, allSpans, nRow: rows.length }, null, 1), 'utf8');
