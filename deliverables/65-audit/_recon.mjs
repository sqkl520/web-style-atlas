import { readFileSync } from 'node:fs';
const src = readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8');
const D = JSON.parse(src.replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
let ok = 0, bad = [];
for (const r of D) {
  const rebuilt = String(r.scenesYes || '') + '不适合：' + String(r.scenesNo || '');
  if (rebuilt === r.scenes) ok++; else bad.push(r.id);
}
console.log('scenes == scenesYes + "不适合：" + scenesNo 的案子：' + ok + '/30');
if (bad.length) { console.log('不符：' + bad.join(' ')); for (const id of bad.slice(0, 4)) { const r = D.find((x) => x.id === id); console.log(id + '\n  scenes: ' + r.scenes + '\n  rebuilt: ' + r.scenesYes + '不适合：' + r.scenesNo); } }
