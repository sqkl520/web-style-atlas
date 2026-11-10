import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const S=load('prototypes/_selection/data.js');
let exact=0; const bad=[];
for (const r of S){
  const rebuild = r.scenesYes + '不适合：' + r.scenesNo;
  if (rebuild === r.scenes) exact++; else bad.push(r.id);
}
console.log('scenes === scenesYes+"不适合："+scenesNo:', exact+'/30', bad.length?('例外 '+bad.join(' ')):'');
console.log('scenesNo 里残留「不适合」字样的:', S.filter(r=>r.scenesNo.includes('不适合')).map(r=>r.id).join(' ')||'无');
console.log('scenesYes 里残留「不适合」的:', S.filter(r=>r.scenesYes.includes('不适合')).map(r=>r.id).join(' ')||'无');
