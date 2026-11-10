import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P='D:/Web/style/prototypes';
const files=readdirSync(join(P,'_specs')).filter(f=>/^S\d{2}\.md$/.test(f)).sort();
function f5(t){const i=t.indexOf('布局与网格');if(i<0)return '';const rest=t.slice(i);const m=rest.search(/\n\s*\*{0,2}6[\.．]/);return m>0?rest.slice(0,m):rest.slice(0,3000);}
const probe=/[\/／]\s*行高/; const ascii=/[^／]\/\s*行高/; const full=/／\s*行高/;
let any=0,a=0,fu=0;const anyIds=[],aIds=[],fuIds=[];
for(const f of files){const s=f5(readFileSync(join(P,'_specs',f),'utf8'));const id=f.slice(0,3);
 if(/行高\s*[\d.]/.test(s)&&/\d+\s*px/.test(s)){any++;}
 if(ascii.test(s)&&/(\d+)\s*px\s*\/\s*行高/.test(s)){a++;aIds.push(id);}
 if(full.test(s)){fu++;fuIds.push(id);}
}
console.log('含"字号+行高"型断言的案: 任意写法 '+any);
console.log('探针正则 (ASCII / 行高) 命中: '+a+'  '+aIds.join(','));
console.log('全角 ／行高 的案: '+fu+'  '+fuIds.join(','));
