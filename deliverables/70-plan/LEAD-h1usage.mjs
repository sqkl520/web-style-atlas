import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style';
const pc = readFileSync(ROOT + '/prototypes/_selection/prompt-copy.js', 'utf8');

console.log('=== 字阶 / 字号相关：prompt-copy.js 里怎么用 h1Size ===');
pc.split(/\r?\n/).forEach((l, i) => {
  if (/h1Size|字号|font-size|字阶|type.?scale/i.test(l)) console.log(`${i + 1}: ${l.trim().slice(0, 170)}`);
});

console.log('\n=== 找到 mech 附近完整上下文（L270-300）===');
const lines = pc.split(/\r?\n/);
lines.slice(269, 300).forEach((l, i) => console.log(`${i + 270}: ${l}`));
