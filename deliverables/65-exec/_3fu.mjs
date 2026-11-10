import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const S=load('prototypes/_selection/data.js');
for (const r of S){
  const blob=JSON.stringify(r);
  const inAny = blob.includes('必须不存在') || blob.includes('必须可测量');
  console.log(r.id, '含 3-附 三指标正文:', inAny?'是':'否');
}
