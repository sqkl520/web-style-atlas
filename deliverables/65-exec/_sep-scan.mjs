import { readFileSync } from 'node:fs';
const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
let bareCount=0, total=0; const samples=[];
for (let i=1;i<=30;i++){
  const id='S'+String(i).padStart(2,'0');
  const text=readFileSync('prototypes/_specs/'+id+'.md','utf8');
  const all=[...text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*'+NAME+'：','gm'))];
  for (const m of all) {
    total++;
    const hasSep=/^\d{1,2}([.．]|-附)/.test(m[0]);
    if(!hasSep){ bareCount++; samples.push(id+' | '+JSON.stringify(m[0].slice(0,50))); }
  }
}
console.log('A 命中总数', total, '｜其中"数字后无 . 无 -附"的', bareCount);
console.log(samples.join('\n'));
