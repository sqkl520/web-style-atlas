import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P='D:/Web/style/prototypes';
const dirs=readdirSync(P,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}-/.test(d.name)).map(d=>d.name);
const find=(id)=>dirs.find(d=>d.startsWith(id+'-'));
function f5(id){const t=readFileSync(join(P,'_specs',id+'.md'),'utf8');const i=t.indexOf('布局与网格');const rest=t.slice(i);const m=rest.search(/\n\s*\*{0,2}6[\.．]/);return m>0?rest.slice(0,m):rest.slice(0,3000);}
const rows=[];
for(const d of dirs){const id=d.slice(0,3);const s=f5(id);
  const g=s.match(/(?:栏沟|栏间距|栏距)\s*(\d+)\s*px/);
  const out=[];
  if(g){const gv=+g[1];const css=readFileSync(join(P,d,'style.css'),'utf8');const re=new RegExp('(?<![\\d.])'+gv+'px','g');const hits=(css.match(re)||[]).length;const vd=new RegExp('--[\\w-]+\\s*:\\s*'+gv+'px').test(css);out.push(`栏沟${gv}:${hits}处${vd?'/变量':''}${(hits>=3||vd)?'✓':'⚠'}`);}
  const lh=s.match(/行高\s*([\d.]+)/);
  if(lh){const lv=lh[1];const css=readFileSync(join(P,d,'style.css'),'utf8');const hits=(css.match(new RegExp('line-height\\s*:\\s*'+lv.replace('.','\\.'),'g'))||[]).length;out.push(`行高${lv}:${hits}处${hits?'✓':'⚠'}`);}
  const bt=s.match(/正文\s*(\d+)\s*px/);
  if(bt){const bv=bt[1];const css=readFileSync(join(P,d,'style.css'),'utf8');const hits=(css.match(new RegExp('font-size\\s*:\\s*'+bv+'px','g'))||[]).length;out.push(`正文${bv}px:${hits}处${hits?'✓':'⚠'}`);}
  const mg=s.match(/(?:外距|内距)\s*(\d+)\s*px/);
  if(mg){const mv=+mg[1];const css=readFileSync(join(P,d,'style.css'),'utf8');const hits=(css.match(new RegExp('(?<![\\d.])'+mv+'px','g'))||[]).length;out.push(`外距${mv}:${hits}处${hits>=2?'✓':'⚠'}`);}
  if(out.length)rows.push(id+'  '+out.join('  '));
}
console.log(rows.join('\n'));
