import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const B=load('prototypes/_selection/data.js');
console.log('audit 非空:', B.filter(r=>r.audit && r.audit.length).length+'/30');
console.log('audit 总字数:', B.reduce((a,r)=>a+(r.audit||'').length,0));
for (const id of ['S01','S13','S18','S30']) {
  const r=B.find(x=>x.id===id);
  console.log('\n--- '+id+' audit ('+r.audit.length+' 字) ---');
  console.log(r.audit);
}
