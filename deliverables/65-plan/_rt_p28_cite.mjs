// 探针 28：收尾——audit 里 C 条款引用的绝对数、以及它指向的文档能否从用户界面到达。
import { readFileSync } from 'node:fs';
import { loadData } from './_rt_lib.mjs';

const D = loadData();
const all = D.map((r) => r.audit || '').join('\n');
const cAll = [...all.matchAll(/C-\d+(?:[.\s]?\d+)?/g)].map((m) => m[0]);
const uniqC = [...new Set(cAll)];
const pAll = [...all.matchAll(/\bP\d+/g)].map((m) => m[0]);
const rAll = [...all.matchAll(/R-\d+/g)].map((m) => m[0]);
console.log('audit 字段里的条款引用：');
console.log('  C-* 总出现 ' + cAll.length + ' 次，去重 ' + uniqC.length + ' 种');
console.log('  P*  总出现 ' + pAll.length + ' 次，去重 ' + [...new Set(pAll)].length + ' 种');
console.log('  R-* 总出现 ' + rAll.length + ' 次，去重 ' + [...new Set(rAll)].length + ' 种');
console.log('  含至少一个条款引用的案：' + D.filter((r) => /C-\d|P\d|R-\d/.test(r.audit || '')).length + '/30');
console.log('  引用 01-research-brief.md / 02 号文件的案：' + D.filter((r) => /01-research-brief|02 号|文件 01|R-2\d/.test(r.audit || '')).length + '/30');

console.log('');
console.log('这些条款定义在哪：');
const rules = readFileSync('D:/Web/style/deliverables/02-anti-ai-rules.md', 'utf8');
console.log('  deliverables/02-anti-ai-rules.md 里出现的 C-1.3 / C-2.11 / C-2.15：' +
  ['C-1.3', 'C-2.11', 'C-2.15'].map((k) => k + '=' + (rules.includes(k) ? '有' : '无')).join(' '));

console.log('');
console.log('从用户能点到的界面能否到达 02-anti-ai-rules.md：');
const uiFiles = ['prototypes/_selection/index.html', 'prototypes/_selection/app.js', 'prototypes/_selection/prompt-copy.js', 'prototypes/_selection/prompts.js', 'README.md'];
let hit = 0;
for (const f of uiFiles) {
  const t = readFileSync('D:/Web/style/' + f, 'utf8');
  const n = (t.match(/02-anti-ai/g) || []).length;
  if (n) hit += n;
  console.log('  ' + f.padEnd(46) + ' 命中 ' + n);
}
console.log('  ⇒ 合计 ' + hit + ' 处。用户读到「反 C-1.3」时，界面上没有任何链接能查这句话是什么意思。');
console.log('');
console.log('对照：audit 里「跳脱之处」出现 ' + (all.match(/跳脱之处/g) || []).length + ' 次（Lead 的 B+ 方案要靠它做摘要）');
console.log('  「跳脱之处」其实是**评审语汇**，不是给终端用户的话。它回答的是「这个方案够不够跳脱」，');
console.log('  不是「这风格适不适合我」。');
