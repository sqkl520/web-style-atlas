import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const S=load('prototypes/_selection/data.js');
for (const id of ['S11','S12','S20']) {
  const r=S.find(x=>x.id===id);
  console.log('=== '+id+' scenesNo:');
  console.log(r.scenesNo);
  console.log('');
}
