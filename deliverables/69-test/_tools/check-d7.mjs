// 核实 D7：有多少案的提示词同时有「请先告诉我」与「只给代码」。
import { readFileSync } from 'node:fs';
const S = 'D:/Web/style/deliverables/69-test/_staging';
const idx = JSON.parse(readFileSync(`${S}/index.json`, 'utf8'));
const withTell = [], withCodeOnly = [], both = [];
for (const r of idx) {
  const p = readFileSync(`${S}/prompt-${r.id}.txt`, 'utf8');
  const t = p.includes('请先告诉我');
  const c = p.includes('只给代码');
  if (t) withTell.push(r.id);
  if (c) withCodeOnly.push(r.id);
  if (t && c) both.push(r.id);
}
console.log('含「请先告诉我」= ', withTell.length, withTell.join(' '));
console.log('含「只给代码」  = ', withCodeOnly.length);
console.log('两者都有        = ', both.length, both.join(' '));
