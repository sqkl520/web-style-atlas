import { readFileSync } from 'node:fs';
const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
const seen=new Map();
for (let i=1;i<=30;i++){
  const id='S'+String(i).padStart(2,'0');
  const text=readFileSync('prototypes/_specs/'+id+'.md','utf8');
  const starts=[];
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附|[.．])\\s*'+NAME+'：','gm'))) starts.push({i:m.index,end:m.index+m[0].length,key:m[3]});
  for (const m of text.matchAll(new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*'+NAME+'\\*\\*\\s*$','gm'))) starts.push({i:m.index,end:m.index+m[0].length,key:m[3]});
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*'+NAME+'\\*\\*\\s*[：:]','gm'))) starts.push({i:m.index,end:m.index+m[0].length,key:m[3]});
  starts.sort((a,b)=>a.i-b.i);
  for (const s of starts){ const k=s.key.replace(/（[^）]*）/g,'').trim(); seen.set(k,(seen.get(k)||0)+1); }
}
console.log('全库出现过的字段 key（计数）：');
for (const [k,v] of [...seen.entries()].sort((a,b)=>b[1]-a[1])) console.log('  '+JSON.stringify(k)+' × '+v);
console.log('\n key 恰好等于 "机制" 的次数:', seen.get('机制')||0);
console.log(' key 为空串（=1-附/3-附 剥括号后）的次数:', seen.get('')||0);
