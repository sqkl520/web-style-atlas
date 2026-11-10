// 任务 2 探针：`prompt-copy.js` 注释里每个案号被"提及"的字数。
//
// 口径要说清（Lead 给的 S19=3128 / S06=3122 / S18=1355 / S20=S21=S28=0 我要能复现）：
//   mentionChars = 所有**包含该案号的 CSS 块注释**的字符数之和（去重：同一注释只计一次）。
//   这是"信息隔离"的度量：注释里写了这个原型的事实（如"S19 的 .e4 是 0.4"），
//   任何读过生成器的人就不再是对该案的盲评者。
import { readFileSync, writeFileSync } from 'node:fs';

const F = 'D:/Web/style/prototypes/_selection/prompt-copy.js';
const OUT = 'D:/Web/style/deliverables/69-audit';
const src = readFileSync(F, 'utf8');

const comments = [...src.matchAll(/\/\*[\s\S]*?\*\//g)].map((m) => ({ text: m[0], at: m.index }));
const lineComments = [...src.matchAll(/(^|\n)\s*\/\/([^\n]*)/g)].map((m) => ({ text: m[2], at: m.index }));

const ids = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const rec = {};
for (const id of ids) {
  const re = new RegExp(id + '(?!\\d)', 'g');
  const hitBlocks = comments.filter((c) => re.test(c.text) || (re.lastIndex = 0, re.test(c.text)));
  // 重置 lastIndex 防护（test 带 g 会记住位置）
  const blocks = comments.filter((c) => { const rr = new RegExp(id + '(?!\\d)'); return rr.test(c.text); });
  const lc = lineComments.filter((c) => new RegExp(id + '(?!\\d)').test(c.text));
  const chars = blocks.reduce((a, b) => a + b.text.length, 0) + lc.reduce((a, b) => a + b.text.length, 0);
  rec[id] = {
    mentionChars: chars,
    nBlocks: blocks.length,
    nLine: lc.length,
    // 注释里出现该案号的原文片段（前 3 条，供人核对"到底泄露了什么"）
    samples: blocks.slice(0, 3).map((b) => b.text.replace(/\s+/g, ' ').slice(0, 150)),
  };
}
writeFileSync(OUT + '/t2-isolation.json', JSON.stringify(rec, null, 1), 'utf8');

console.log('id    提及字数  注释块  行注释   隔离判定');
const sorted = ids.slice().sort((a, b) => rec[b].mentionChars - rec[a].mentionChars);
for (const id of ids) {
  const c = rec[id].mentionChars;
  console.log(id.padEnd(6), String(c).padEnd(9), String(rec[id].nBlocks).padEnd(7), String(rec[id].nLine).padEnd(7),
    c === 0 ? '✔ 干净' : c < 200 ? '△ 轻度' : c < 1500 ? '✗ 不干净' : '✗✗ 严重');
}
console.log('\n按提及字数排序（降序）：');
console.log(sorted.map((id) => id + '=' + rec[id].mentionChars).join('  '));
console.log('\n干净（0 字）的案：', ids.filter((id) => rec[id].mentionChars === 0).join(',') || '无');
