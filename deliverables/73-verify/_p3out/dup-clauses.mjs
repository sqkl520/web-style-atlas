import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P='D:/Web/style/prototypes';
const ids=readdirSync(join(P,'_specs')).filter(f=>/^S\d{2}\.md$/.test(f)).sort().map(f=>f.slice(0,3));
function field3(id){const t=readFileSync(join(P,'_specs',id+'.md'),'utf8');const i=t.indexOf('配色系统');if(i<0)return null;const lines=t.slice(i).split(/\r?\n/);const buf=[lines[0]];for(let k=1;k<lines.length;k++){if(/^\*{0,2}4[\.．]?\s/.test(lines[k].trim()))break;buf.push(lines[k]);}return buf.join('\n');}
for(const id of ['S05','S10','S23','S02']){const seg=field3(id);console.log(`\n===== ${id} 全部含 hex 的分句 =====`);
 for(const clause of seg.split(/[；;。\n]/)){const h=(clause.match(/#[0-9A-Fa-f]{6}/g)||[]);if(!h.length)continue;console.log(`  [${h.map(x=>x.toUpperCase()).join(',')}] <<${clause.trim().slice(0,150)}>>`);}}
