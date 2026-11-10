import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P='D:/Web/style/prototypes';
const files=readdirSync(join(P,'_specs')).filter(f=>/^S\d{2}\.md$/.test(f)).sort();
function f5(t){const i=t.indexOf('布局与网格');if(i<0)return '';const rest=t.slice(i);const m=rest.search(/\n\s*\*{0,2}6[\.．]/);return m>0?rest.slice(0,m):rest.slice(0,3000);}
let span=0,total_=0,other=0;const ex={span:[],total:[]};
for(const f of files){const s=f5(readFileSync(join(P,'_specs',f),'utf8'));
 for(const m of s.matchAll(/(\d+)\s*栏/g)){
   const pre=s.slice(Math.max(0,m.index-14),m.index);
   if(/跨|占\s*$|右\s*$|左\s*$|第\s*$/.test(pre)||/跨$/.test(pre)){span++;if(ex.span.length<6)ex.span.push(f.slice(0,3)+':'+m[1]);}
   else {total_++;if(ex.total.length<6)ex.total.push(f.slice(0,3)+':'+m[1]);}
 }}
console.log('字段5内 83 条栏数提及中：');
console.log('  像"跨 N 栏 / 占 N 栏 / 第 N 栏"（是跨度或位置，不是轨道数）= '+span+'  例: '+ex.span.join(' '));
console.log('  其余（更像轨道总数或分区数）                                = '+total_+'  例: '+ex.total.join(' '));
