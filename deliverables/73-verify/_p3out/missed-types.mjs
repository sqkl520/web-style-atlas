import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P='D:/Web/style/prototypes';
const ids=readdirSync(join(P,'_specs')).filter(f=>/^S\d{2}\.md$/.test(f)).sort().map(f=>f.slice(0,3));
function f5(id){const t=readFileSync(join(P,'_specs',id+'.md'),'utf8');const i=t.indexOf('布局与网格');if(i<0)return '';const rest=t.slice(i);const m=rest.search(/\n\s*\*{0,2}6[\.．]/);return m>0?rest.slice(0,m):rest.slice(0,3000);}
// which clauses in field5 contain <,>,≥,≤ followed by 3-4 digits but NOT px right after? and other numeric assertions
const pats=[
 ['栏沟', /栏沟\s*(\d+(?:\.\d+)?)\s*px/g],
 ['外距/内距', /(?:外距|内距|左出血|右出血|出血|版心|留白)\s*(\d+(?:\.\d+)?)\s*px/g],
 ['行高', /行高\s*([\d.]+)/g],
 ['正文', /正文\s*(\d+(?:\.\d+)?)\s*px/g],
 ['基线', /基线\s*(\d+(?:\.\d+)?)\s*px/g],
 ['栏宽', /栏宽\s*(\d+(?:\.\d+)?)\s*px/g],
 ['radii', /圆角\s*(\d+(?:\.\d+)?)\s*px/g],
];
const tally=new Map();
for(const id of ids){const s=f5(id);
  for(const [k,re] of pats){const n=[...s.matchAll(re)].length; if(n){const c=tally.get(k)||{n:0,cases:0,ex:[]};c.n+=n;c.cases++;if(c.ex.length<2)c.ex.push(id+': '+[...s.matchAll(re)].slice(0,2).map(m=>m[0]).join(' | '));tally.set(k,c);}}
}
for(const [k,v] of [...tally].sort((a,b)=>b[1].n-a[1].n)) console.log(`${k.padEnd(10)} 字段5内出现 ${String(v.n).padStart(3)} 次 / ${v.cases} 案   例: ${v.ex.join('  ;;  ')}`);
console.log('\n合计: '+[...tally.values()].reduce((a,v)=>a+v.n,0));
