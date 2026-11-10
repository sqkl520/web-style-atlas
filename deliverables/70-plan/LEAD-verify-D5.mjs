import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = 'D:/Web/style';

console.log('=== 1. D5 核实：S28 原型实际是几行几块？每行占几栏？===\n');
const css = readFileSync(ROOT + '/prototypes/S28-jazz-intaglio-wall/style.css', 'utf8');
const html = readFileSync(ROOT + '/prototypes/S28-jazz-intaglio-wall/index.html', 'utf8');

// 找 grid 定义
css.split(/\r?\n/).forEach((l, i) => {
  if (/grid-template-columns|grid-column|grid-row|grid-area|--cols|span/.test(l)) {
    console.log(`  ${i + 1}: ${l.trim().slice(0, 140)}`);
  }
});

console.log('\n=== 2. HTML 里板块数量与它们的 grid-column 声明 ===\n');
const blocks = [...html.matchAll(/<(?:figure|div|article)[^>]*class="[^"]*(?:plate|block|tile|piece)[^"]*"[^>]*>/g)];
console.log(`匹配到 ${blocks.length} 个带 plate/block/tile/piece 类的元素`);
// 找 style 属性里的 grid-column
const withCol = [...html.matchAll(/style="[^"]*grid-column[^"]*"/g)];
console.log(`带 inline grid-column 的: ${withCol.length}`);
withCol.slice(0, 15).forEach((m) => console.log(`  ${m[0].slice(0, 100)}`));

console.log('\n=== 3. 找 S28 CSS 里的栏宽分配 ===\n');
const colDefs = [...css.matchAll(/grid-template-columns\s*:\s*([^;}]+)/g)];
colDefs.forEach((m) => console.log(`  ${m[1].trim().slice(0, 140)}`));

console.log('\n=== 4. 找每个板块的 span 定义 ===\n');
const spans = [...css.matchAll(/grid-column\s*:\s*([^;}]+)/g)];
console.log(`grid-column 规则 ${spans.length} 条:`);
spans.forEach((m) => console.log(`  ${m[1].trim().slice(0, 80)}`));

console.log('\n=== 5. 规格原文：「12 块拼贴面积不等（最大一块占 7 栏，最小一块占 2 栏）」 ===');
console.log('规格没有说「12 块在同一行」。批判 Agent 的指控方向正确。');
console.log('\n若 12 块分 4 行 × 3 块，每行总和 16 栏：');
console.log('  例：7+7+2=16, 5+5+6=16, ... 完全可行');
console.log('若 12 块在同一行：12×2=24 > 16，不可能');
console.log('\n→ 所以「12×2=24>16」这个反证只在「同一行」假设下成立。');
