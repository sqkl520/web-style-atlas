import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P='D:/Web/style/prototypes';
const files=readdirSync(join(P,'_specs')).filter(f=>/^S\d{2}\.md$/.test(f)).sort();
function f5(t){const i=t.indexOf('布局与网格');if(i<0)return '';const rest=t.slice(i);const m=rest.search(/\n\s*\*{0,2}6[\.．]/);return m>0?rest.slice(0,m):rest.slice(0,3000);}
let whole=0,inF5=0;const rows=[];
for(const f of files){const t=readFileSync(join(P,'_specs',f),'utf8');const a=[...t.matchAll(/(\d+)\s*栏/g)].length;const b=[...f5(t).matchAll(/(\d+)\s*栏/g)].length;whole+=a;inF5+=b;rows.push(`${f.slice(0,3)} 全文${a} / 字段5内${b}`);}
console.log(rows.join('\n'));
console.log(`\n"栏数"断言: 全文计 ${whole} 条, 字段5内只有 ${inF5} 条 → ${whole-inF5} 条来自非布局字段`);
