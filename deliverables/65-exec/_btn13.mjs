import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const S=load('prototypes/_selection/data.js');
const miss=S.filter(r=>!r.buttonText).map(r=>r.id);
console.log('无 buttonText 的 13 案:', miss.join(' '));
for (const id of miss) {
  const md=readFileSync('prototypes/_specs/'+id+'.md','utf8');
  const hits=[...md.matchAll(/[^\n]{0,40}(按钮|白字|黑字)[^\n]{0,40}/g)].map(m=>m[0].trim());
  console.log('\n=== '+id+' 规格里提到按钮/白字/黑字的句子 ('+hits.length+') ===');
  for (const h of hits.slice(0,4)) console.log('  · '+h);
}
