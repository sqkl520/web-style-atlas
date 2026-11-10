import { readFileSync, writeFileSync } from 'node:fs';
const p = 'D:/Web/style/deliverables/70-exec/EXEC-B-linewidth-negative.md';
let t = readFileSync(p, 'utf8');
const FENCE = String.fromCharCode(96).repeat(3);
const lines = t.split('\n');
console.log('last 3 before:', JSON.stringify(lines.slice(-4)));
/* 去掉结尾残缺的围栏行（1~3 个反引号） */
while (lines.length && /^\s*`{0,3}\s*$/.test(lines[lines.length - 1])) lines.pop();
lines.push(FENCE, '');
t = lines.join('\n');
writeFileSync(p, t, 'utf8');
const after = t.split('\n');
console.log('last 3 after:', JSON.stringify(after.slice(-4)));
console.log('total lines', after.length);
/* 校验每个 8.x 小节都有成对围栏 */
const fences = (t.match(new RegExp('^' + FENCE, 'gm')) || []).length;
console.log('fence lines:', fences, fences % 2 === 0 ? 'OK (even)' : 'BAD (odd)');
