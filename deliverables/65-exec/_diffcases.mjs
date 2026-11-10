import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const A=load('deliverables/65-exec/data.before.js'), B=load('deliverables/65-exec/data.after-layout.js');
const changed=[];
for (let i=0;i<A.length;i++){
  const a=A[i], b=B[i];
  const keys=new Set([...Object.keys(a),...Object.keys(b)]);
  const diff=[];
  for (const k of keys){ if(JSON.stringify(a[k])!==JSON.stringify(b[k])) diff.push(k); }
  if(diff.length) changed.push(a.id+' -> '+diff.join(','));
}
console.log('变化的案：'); console.log(changed.join('\n') || '（无）');
console.log('\nS12 layout:', JSON.stringify(B.find(x=>x.id==='S12').layout).slice(0,100));
console.log('S15 layout:', JSON.stringify(B.find(x=>x.id==='S15').layout).slice(0,100));
console.log('S19 layout:', JSON.stringify(B.find(x=>x.id==='S19').layout).slice(0,100));
