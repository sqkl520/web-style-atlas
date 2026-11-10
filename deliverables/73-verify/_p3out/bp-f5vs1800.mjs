import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P='D:/Web/style/prototypes';
const ids=readdirSync(join(P,'_specs')).filter(f=>/^S\d{2}\.md$/.test(f)).sort().map(f=>f.slice(0,3));
function f5(id){const t=readFileSync(join(P,'_specs',id+'.md'),'utf8');const i=t.indexOf('布局与网格');if(i<0)return '';const rest=t.slice(i);const m=rest.search(/\n\s*\*{0,2}6[\.．]/);return m>0?rest.slice(0,m):rest.slice(0,3000);}
const bp=(s)=>{const o=new Set();for(const m of s.matchAll(/[<≤>≥]\s*=?\s*(\d{3,4})\s*px/g))o.add(+m[1]);for(const m of s.matchAll(/(\d{3,4})\s*[–\-~]\s*(\d{3,4})\s*px/g)){o.add(+m[1]);o.add(+m[2]);}return [...o].sort((a,b)=>a-b);};
let spillCases=0;
for(const id of ids){const t=readFileSync(join(P,'_specs',id+'.md'),'utf8');const i=t.indexOf('布局与网格');const win=t.slice(i,i+1800);const proper=f5(id);
  const a=bp(win), b=bp(proper);
  const extra=a.filter(x=>!b.includes(x)); const missed=b.filter(x=>!a.includes(x));
  if(extra.length||missed.length){spillCases++;console.log(`${id} field5len=${proper.length} win=[${a}] f5=[${b}]  仅窗口有=${extra}  仅字段5有=${missed}`);}
}
console.log('\n受影响案数: '+spillCases);
