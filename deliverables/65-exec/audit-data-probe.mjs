// 数据层探针（只读）：palette 长度 / bg 与 palette[0] 关系 / family 首句与全文长度。
import { readFileSync } from 'node:fs';

const load = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const B = load('prototypes/_selection/data.js');

console.log('=== palette 长度分布 ===');
const lens = {};
for (const r of B) lens[r.palette.length] = (lens[r.palette.length] || 0) + 1;
console.log(JSON.stringify(lens));

console.log('\n=== palette[0] === bg ===');
console.log('palette[0]===bg: ' + B.filter((r) => r.palette[0] === r.bg).length + '/30');
console.log('primary===palette[1]: ' + B.filter((r) => r.primary === r.palette[1]).length + '/30');
console.log('不符合的案: ' + B.filter((r) => r.palette[0] !== r.bg).map((r) => r.id + ' palette0=' + r.palette[0] + ' bg=' + r.bg).join('; ') || '（无）');

console.log('\n=== family 长度与当前行卡截断值 ===');
let lost = 0;
for (const r of B) {
  const cur = (r.family || '').split('。')[0].split('：').pop().slice(0, 34);
  lost += (r.family || '').length - cur.length;
  console.log(r.id, 'family', (r.family || '').length, '→ 行卡', cur.length, JSON.stringify(cur));
}
console.log('合计丢失', lost, '字');

console.log('\n=== family 首句结构（看有多少条首句自带「参考对象：」）===');
for (const r of B) {
  const first = (r.family || '').split('。')[0];
  console.log(r.id, JSON.stringify(first));
}
