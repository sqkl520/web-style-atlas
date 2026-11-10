import { readFileSync } from 'node:fs';
const S = JSON.parse(readFileSync('prototypes/_selection/data.js','utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
for (const id of ['S11','S12','S13','S15','S19']) {
  const r=S.find(x=>x.id===id);
  console.log(id, 'layout=', JSON.stringify(r.layout).slice(0,80));
}
console.log('---FIELDS 是否被代码引用---');
const cs = readFileSync('prototypes/_build/collect-schemes.mjs','utf8');
const lines = cs.split(/\r?\n/);
lines.forEach((l,i)=>{ if(l.includes('FIELDS')) console.log((i+1)+': '+l.slice(0,120)); });
