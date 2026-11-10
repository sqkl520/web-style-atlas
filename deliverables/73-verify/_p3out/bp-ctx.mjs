import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P='D:/Web/style/prototypes';
const ids=readdirSync(join(P,'_specs')).filter(f=>/^S\d{2}\.md$/.test(f)).sort().map(f=>f.slice(0,3));
let total=0;
for(const id of ids){
  const md=readFileSync(join(P,'_specs',id+'.md'),'utf8');
  const i=md.indexOf('布局与网格'); if(i<0){console.log(id+' NO FIELD5');continue;}
  const seg=md.slice(i,i+1800);
  const hits=[];
  for(const m of seg.matchAll(/[<≤>≥]\s*=?\s*(\d{3,4})\s*px/g)) hits.push({v:+m[1],src:'rel',ctx:seg.slice(Math.max(0,m.index-26),m.index+m[0].length+10).replace(/\n/g,' ')});
  for(const m of seg.matchAll(/(\d{3,4})\s*[–\-~]\s*(\d{3,4})\s*px/g)) hits.push({v:+m[1],src:'range',ctx:seg.slice(Math.max(0,m.index-20),m.index+m[0].length+6).replace(/\n/g,' ')},{v:+m[2],src:'range',ctx:seg.slice(Math.max(0,m.index-20),m.index+m[0].length+6).replace(/\n/g,' ')});
  total+=hits.length;
  console.log(`\n=== ${id} (${hits.length} raw matches) seglen=${seg.length}`);
  for(const h of hits) console.log(`   ${h.src} ${h.v}  <<${h.ctx}>>`);
}
console.log('\nTOTAL raw breakpoint matches: '+total);
