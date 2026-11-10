import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const A=load('deliverables/65-exec/data.after-layout.js');
const r=A.find(x=>x.id==='S13');
console.log('\nS13 risk 前 200 字:', JSON.stringify(r.risk.slice(0,200)));
console.log('S13 risk 含「反套路改造三指标」:', r.risk.includes('反套路改造三指标'));
console.log('S13 risk 长度:', r.risk.length);
