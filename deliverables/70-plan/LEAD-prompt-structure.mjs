import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style';
const pc = readFileSync(ROOT + '/prototypes/_selection/prompt-copy.js', 'utf8');

console.log('=== prompt-copy.js 里 签名动作 / mechanism 相关 ===');
pc.split(/\r?\n/).forEach((l, i) => {
  if (/签名动作|mechanism|motion|动作/.test(l)) console.log(`${i + 1}: ${l.trim().slice(0, 170)}`);
});

console.log('\n=== prompts.js 的键名清单（第一案的完整结构）===');
const pr = readFileSync(ROOT + '/prototypes/_selection/prompts.js', 'utf8');
// 找 STYLE_PROMPTS 定义
const decl = pr.indexOf('STYLE_PROMPTS');
console.log('STYLE_PROMPTS 位置:', decl);
console.log(JSON.stringify(pr.slice(decl, decl + 1500)));
