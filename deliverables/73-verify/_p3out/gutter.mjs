import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P='D:/Web/style/prototypes';
const dirs=readdirSync(P,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}-/.test(d.name)).map(d=>d.name);
const find=(id)=>dirs.find(d=>d.startsWith(id+'-'));
function f5(id){const t=readFileSync(join(P,'_specs',id+'.md'),'utf8');const i=t.indexOf('布局与网格');const rest=t.slice(i);const m=rest.search(/\n\s*\*{0,2}6[\.．]/);return m>0?rest.slice(0,m):rest.slice(0,3000);}
const rows=[];
for(const id of ['S01','S02','S03','S06','S07','S08','S09','S10','S21','S23','S27']){
  const s=f5(id);
  const g=s.match(/(?:栏沟|栏间距|栏距)\s*(\d+)\s*px/);
  if(!g) continue;
  const gv=+g[1];
  const css=readFileSync(join(P,find(id),'style.css'),'utf8');
  const re=new RegExp('(?<![\\d.])'+gv+'px','g');
  const hits=(css.match(re)||[]).length;
  const varDef=new RegExp('--[\\w-]+\\s*:\\s*'+gv+'px').test(css);
  rows.push(`${id} 规格栏沟=${gv}px  CSS 该值出现 ${String(hits).padStart(3)} 次  变量定义=${varDef}  ${hits>=3||varDef?'✓ 可视为落地':'⚠ 弱证据'}`);
}
console.log(rows.join('\n'));
