import { readFileSync } from 'node:fs';
const t = readFileSync('deliverables/78-northstar/blind/S34/task.txt', 'utf8');
const re = /版式里至少要\s*(\d+)\s*个\*?\*?不同的\*?\*?图片位置/;
const m = t.match(re);
console.log('S34 claimed:', m ? m[1] : 'NO MATCH');
const line = t.split('\n').find((l) => l.includes('图片位置'));
console.log('line:', JSON.stringify(line));
// 用变异后的 prompts 生成一次提示词看 claimed
