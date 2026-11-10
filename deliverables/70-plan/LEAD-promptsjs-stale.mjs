import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style';
const pr = readFileSync(ROOT + '/prototypes/_selection/prompts.js', 'utf8');

console.log('=== prompts.js 里 S19 的 h1Size 字段值 ===\n');
const i = pr.indexOf('h1Size');
// 找所有 h1Size: "..." 的实例
const matches = [...pr.matchAll(/h1Size"?\s*:\s*"([^"]*)"/g)];
console.log(`共 ${matches.length} 个 h1Size 字段:`);
matches.slice(0, 8).forEach((m, k) => console.log(`  ${k + 1}. ${JSON.stringify(m[1])}`));

console.log('\n=== 对照 dna-clean.json 的当前值 ===');
const dna = JSON.parse(readFileSync(ROOT + '/prototypes/_prompts/dna-clean.json', 'utf8'));
const arr = Array.isArray(dna) ? dna : Object.values(dna);
arr.slice(0, 8).forEach((e) => console.log(`  ${e.id}: ${JSON.stringify(e.h1Size)}`));

console.log('\n=== 判定：prompts.js 是否落后于 dna-clean.json ===');
let stale = 0;
for (let k = 0; k < Math.min(matches.length, arr.length); k++) {
  if (matches[k][1] !== arr[k].h1Size) {
    stale++;
    if (stale <= 8) console.log(`  ${arr[k].id}  prompts.js=${JSON.stringify(matches[k][1])}  dna-clean=${JSON.stringify(arr[k].h1Size)}`);
  }
}
console.log(`\n不一致: ${stale}/${matches.length}`);

console.log('\n=== 检查 prompt-copy.js 里 h1Size 的使用条件 ===');
const pc = readFileSync(ROOT + '/prototypes/_selection/prompt-copy.js', 'utf8');
const lines = pc.split(/\r?\n/);
lines.forEach((l, k) => {
  if (/h1Size|d\.mechanism/.test(l)) console.log(`  ${k + 1}: ${l.trim().slice(0, 130)}`);
});
