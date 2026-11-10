import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P='D:/Web/style/prototypes';
const ids=readdirSync(join(P,'_specs')).filter(f=>/^S\d{2}\.md$/.test(f)).sort().map(f=>f.slice(0,3));
function f5(id){const t=readFileSync(join(P,'_specs',id+'.md'),'utf8');const i=t.indexOf('布局与网格');if(i<0)return '';const rest=t.slice(i);const m=rest.search(/\n\s*\*{0,2}6[\.．]/);return m>0?rest.slice(0,m):rest.slice(0,3000);}
const types=[
 ['栏沟/栏间距', /(?:栏沟|栏间距|列间距|中缝)\s*(\d+(?:\.\d+)?)\s*px/g],
 ['栏宽',       /栏宽\s*(\d+(?:\.\d+)?)\s*px/g],
 ['外距/内距',   /(?:外距|内距|出血)\s*(\d+(?:\.\d+)?)\s*px/g],
 ['行高',       /行高\s*([\d.]+)/g],
 ['正文字号',   /正文\s*(\d+(?:\.\d+)?)\s*px/g],
 ['副字号',     /(?:读数|标注|辅助)\s*(\d+(?:\.\d+)?)\s*px/g],
];
let total=0;
for(const [k,re] of types){let n=0,cs=0;const det=[];
 for(const id of ids){const s=f5(id);const m=[...s.matchAll(re)];if(m.length){n+=m.length;cs++;det.push(id+'('+m.map(x=>x[1]).join('/')+')');}}
 total+=n;console.log(`${k.padEnd(12)} ${String(n).padStart(3)} 条 / ${String(cs).padStart(2)} 案   ${det.slice(0,8).join(' ')}`);}
console.log('\n字段5内被忽略的数值型断言合计 ≈ '+total);
