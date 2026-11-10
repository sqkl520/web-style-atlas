import { readFileSync } from 'node:fs';
const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/65-audit/_raw.json', 'utf8'));

const rules = readFileSync('D:/Web/style/deliverables/02-anti-ai-rules.md', 'utf8');
const brief = readFileSync('D:/Web/style/deliverables/01-research-brief.md', 'utf8');
const all8 = rows.map((r) => r.f8).join('\n');

// C 编号：字段 8 里出现了哪些？（两种写法：C-1.6 与 "C-2 第 11 条"）
const cDotted = [...new Set([...all8.matchAll(/C-\d+\.\d+/g)].map((m) => m[0]))].sort();
const cSpaced = [...new Set([...all8.matchAll(/C-(\d)\s*第\s*(\d+)\s*条/g)].map((m) => `C-${m[1]}.${m[2]}`))].sort();
const refs = [...new Set([...cDotted, ...cSpaced])].sort((a, b) => {
  const [x, y] = a.split('.').map(Number), [p, q] = b.split('.').map(Number);
  return x - p || y - q;
});
console.log('field8 引用的 C 编号共 ' + refs.length + ' 种：' + refs.join(' '));
console.log('（其中"点写" ' + cDotted.length + ' 种；"C-2 第 11 条"式 ' + cSpaced.length + ' 种）\n');

console.log('编号\t在02法典出现\t出现方式');
for (const r of refs) {
  // 在覆盖率矩阵 11.1 里作为行首出现？
  const rowRe = new RegExp('^\\|\\s*' + r.replace('.', '\\.') + '\\s*\\|', 'm');
  const inMatrix = rowRe.test(rules);
  // 在正文里作为 "C-1.6" 出现几次
  const n = (rules.match(new RegExp(r.replace('.', '\\.'), 'g')) || []).length;
  console.log([r, inMatrix ? 'YES(矩阵行)' : (n ? 'YES(正文' + n + '处)' : 'NO'), inMatrix ? '§11.1 覆盖率矩阵有独立一行' : ''].join('\t'));
}

// P 编号
const pRefs = [...new Set([...all8.matchAll(/P(\d+)/g)].map((m) => 'P' + m[1]))].sort((a, b) => +a.slice(1) - +b.slice(1));
console.log('\nfield8 引用的 P 编号：' + pRefs.join(' '));
for (const p of pRefs) {
  const inBrief = new RegExp('\\b' + p + '\\b').test(brief);
  console.log('  ' + p + ' in 01-research-brief.md: ' + (inBrief ? 'YES' : 'NO'));
}
// R 编号
const rRefs = [...new Set([...all8.matchAll(/R-(\d+)/g)].map((m) => 'R-' + m[1]))].sort((a, b) => +a.slice(2) - +b.slice(2));
console.log('\nfield8 引用的 R 编号：' + rRefs.join(' '));
for (const r of rRefs) {
  const ok = new RegExp('^\\|\\s*' + r + '\\s*\\|', 'm').test(rules);
  console.log('  ' + r + ' in 02 规则总表: ' + (ok ? 'YES' : 'NO'));
}
