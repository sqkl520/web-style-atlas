import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const A=load('deliverables/65-exec/data.before.js'), B=load('prototypes/_selection/data.js');
let ok=0; const bad=[];
for(let i=0;i<30;i++){
  const a=A[i],b=B[i];
  const ka=Object.keys(a).filter(k=>k!=='audit'), kb=Object.keys(b).filter(k=>k!=='audit');
  if(JSON.stringify(ka)!==JSON.stringify(kb)) bad.push(a.id+' 键集不同');
  for(const k of ka){ if(JSON.stringify(a[k])!==JSON.stringify(b[k])) bad.push(a.id+'.'+k); }
  if(!bad.some(x=>x.startsWith(a.id))) ok++;
}
console.log('除 audit 外完全一致的案:', ok+'/30');
console.log('差异点:', bad.length?bad.join('\n  '):'（无）');
