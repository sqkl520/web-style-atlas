import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style';

console.log('=== 1. 核实 D5：「16 栏放 12 块，每块最小 2 栏」是否无解 ===\n');
const spec = readFileSync(ROOT + '/prototypes/_specs/S28.md', 'utf8');
const i = spec.indexOf('布局与网格');
const seg = spec.slice(i, i + 1400);
console.log('S28 规格字段5 原文：');
console.log(seg);
