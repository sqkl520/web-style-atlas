#!/usr/bin/env node
// Lead 独立核实 v7：提示词原文对"配色"到底怎么说的？
// 关键问题：提示词说"只用这几个值"是硬约束吗？有没有留出派生色的余地？
import { readFileSync } from 'node:fs';

const p = 'D:/Web/style/prototypes/_selection/prompt-copy.js';
const s = readFileSync(p, 'utf8');
// 找 palette 那段模板
const idx = s.indexOf('palette');
const lines = s.split(/\r?\n/);
lines.forEach((l, i) => {
  if (/palette|配色|只用这|color|色值|不新增|配比|比例/.test(l)) {
    console.log(`${i + 1}: ${l.trim().slice(0, 160)}`);
  }
});
