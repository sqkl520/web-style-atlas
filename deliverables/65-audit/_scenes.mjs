import { readFileSync } from 'node:fs';
const src = readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8');
const D = JSON.parse(src.replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const norm = (s) => String(s || '').replace(/[\s「」『』（）()、，。：:；;"'`*]/g, '');

console.log('=== 1. scenesNo 是否为 scenes 的子串 ===');
let sub = 0, notSub = 0, noNa = 0, yesContainsNa = 0;
const bad = [];
for (const r of D) {
  const sc = String(r.scenes || ''), no = String(r.scenesNo || '');
  if (/不适合/.test(sc)) yesContainsNa++;
  if (!no) { noNa++; continue; }
  if (norm(sc).includes(norm(no))) sub++;
  else { notSub++; bad.push(r.id); }
}
console.log('scenes 里出现「不适合」字样的案子：' + yesContainsNa + '/30');
console.log('scenesNo 是 scenes 的（去标点）子串：' + sub + '/30；不是：' + notSub + '/30；空：' + noNa);

console.log('\n=== 2. 不是子串的案子，逐字对比 ===');
for (const id of bad) {
  const r = D.find((x) => x.id === id);
  console.log('\n' + id);
  console.log('  scenes   (' + r.scenes.length + '): ' + r.scenes.slice(-160));
  console.log('  scenesNo (' + r.scenesNo.length + '): ' + r.scenesNo);
}

console.log('\n=== 3. 字数 ===');
const ch = (s) => String(s || '').replace(/\s/g, '').length;
console.log('scenes   合计 ' + D.reduce((a, r) => a + ch(r.scenes), 0) + ' 字');
console.log('scenesYes 合计 ' + D.reduce((a, r) => a + ch(r.scenesYes), 0) + ' 字');
console.log('scenesNo  合计 ' + D.reduce((a, r) => a + ch(r.scenesNo), 0) + ' 字');
