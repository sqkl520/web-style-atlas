import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style';

console.log('=== 1. S13 的 box-shadow / drop-shadow 在 CSS 里长什么样 ===\n');
const css = readFileSync(ROOT + '/prototypes/S13-blind-debossed-dispatch/style.css', 'utf8');
const lines = css.split(/\r?\n/);
lines.forEach((l, i) => {
  if (/box-shadow|drop-shadow/.test(l)) console.log(`${i + 1}: ${l.trim().slice(0, 170)}`);
});

console.log('\n=== 2. extract-dna.mjs 里的 shadow 抽取逻辑 ===\n');
const ex = readFileSync(ROOT + '/prototypes/_prompts/extract-dna.mjs', 'utf8').split(/\r?\n/);
ex.forEach((l, i) => {
  if (/shadow/i.test(l)) console.log(`${i + 1}: ${l}`);
});

console.log('\n=== 3. clean-dna.mjs 里的 shadowDetail 逻辑 ===\n');
const cd = readFileSync(ROOT + '/prototypes/_prompts/clean-dna.mjs', 'utf8').split(/\r?\n/);
cd.forEach((l, i) => {
  if (/shadowDetail|inset|outer|drops/.test(l)) console.log(`${i + 1}: ${l.trim().slice(0, 170)}`);
});
