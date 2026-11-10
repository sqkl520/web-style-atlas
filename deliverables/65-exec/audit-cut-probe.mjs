// 只读探针：S13 切点附近的字符，以及 S11/S21 里 (1) 那类疑似误命中。
import { readFileSync } from 'node:fs';

const load = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const B = load('prototypes/_selection/data.js');

const s13 = B.find((r) => r.id === 'S13').audit;
const i = s13.indexOf('反套路改造三指标');
console.log('S13 切点', i, '总长', s13.length, '切后剩余', s13.length - i);
console.log('切点前后 20 字的码位：');
for (let k = i - 20; k < i + 6; k++) {
  console.log('  [' + k + '] ' + JSON.stringify(s13[k]) + ' U+' + s13.charCodeAt(k).toString(16).toUpperCase());
}
console.log('slice(0,307) 尾部: ' + JSON.stringify(s13.slice(-12, 307)));
console.log('slice(0,307).trimEnd().length = ' + s13.slice(0, 307).replace(/\s+$/, '').length);
console.log('切后含「打勾」: ' + s13.slice(0, i).includes('打勾') + '；含「供 V-11」: ' + s13.slice(0, i).includes('供 V-11'));
console.log('切后含「反套路」: ' + s13.slice(0, i).includes('反套路'));

console.log('\n=== S11 / S21 的 (n) 命中 ===');
for (const id of ['S11', 'S21']) {
  const t = B.find((r) => r.id === id).audit;
  const ms = [...t.matchAll(/\(\d+\)/g)];
  for (const m of ms) console.log(id, JSON.stringify(t.slice(Math.max(0, m.index - 12), m.index + 12)));
}
