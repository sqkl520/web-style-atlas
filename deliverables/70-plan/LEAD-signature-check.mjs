import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style';
const pr = readFileSync(ROOT + '/prototypes/_selection/prompts.js', 'utf8');

// 找 签名动作
const idx = pr.indexOf('签名动作');
console.log('第一个"签名动作"位置:', idx);
if (idx >= 0) console.log(JSON.stringify(pr.slice(Math.max(0, idx - 300), idx + 400)));

// 统计出现次数
console.log('\n"签名动作"出现次数:', (pr.match(/签名动作/g) || []).length);

// 找 S19 附近的键
const i19 = pr.indexOf('"S19"');
console.log('\n=== S19 前后 800 字符（原始）===');
console.log(JSON.stringify(pr.slice(i19, i19 + 800)));
