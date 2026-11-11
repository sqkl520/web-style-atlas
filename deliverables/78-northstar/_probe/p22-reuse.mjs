// 探针 22：复用偏差 —— 规划 8 案中有多少已在 Q7 盲测里出现过
import { readFileSync, readdirSync } from 'node:fs';

const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/78-northstar/_probe/rows.json', 'utf8'));
const N = 35, n = 8;
const C = (a, b) => { if (b < 0 || b > a) return 0; let r = 1; for (let i = 0; i < b; i++) r = r * (a - i) / (i + 1); return r; };

// Q7 盲测实跑过的案：deliverables/74-q7/out-S*.html 的案号并集
const tested = [...new Set(readdirSync('D:/Web/style/deliverables/74-q7')
  .filter(f => /^out-S\d\d.*\.html$/.test(f))
  .map(f => f.slice(4, 7)))].sort();
console.log('Q7 盲测实跑过的案（按产物文件）:', tested.join(' '), `共 ${tested.length} 案`);

const S8 = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];
const overlap = S8.filter(id => tested.includes(id));
console.log('\n规划 8 案 ∩ Q7 盲测 =', overlap.join(' '), `共 ${overlap.length} 案`);
console.log('未测过的 =', S8.filter(id => !tested.includes(id)).join(' ') || '(无)');

const K = tested.length;
console.log(`\n超几何：全库 ${K}/35 已盲测；随机抽 8 案期望命中 ${(K * n / N).toFixed(2)} 案`);
let pge = 0; for (let i = overlap.length; i <= Math.min(K, n); i++) pge += C(K, i) * C(N - K, n - i) / C(N, n);
console.log(`P(X >= ${overlap.length}) = ${(pge * 100).toFixed(3)}%`);

// 逐案：是否在 Q7 之后因 Q7 结论改过提示词
const healed = ['S03', 'S07']; // Q7 报告第三节：S03 补三轨比例、S07 机制句命中比例
console.log('\nQ7 之后因该次盲测结论被改过提示词的案:', healed.join(' '));
console.log('这 2 案在规划 8 案里的数量:', S8.filter(id => healed.includes(id)).length);

// 8 案的"已被测过"占比
console.log(`\n=> 8 案里 ${overlap.length}/8 = ${(overlap.length / 8 * 100).toFixed(0)}% 已有 Q7 盲测产物`);
console.log(`=> 真正"未验证"的只有 ${8 - overlap.length} 案: ${S8.filter(id => !tested.includes(id)).join(' ')}`);
