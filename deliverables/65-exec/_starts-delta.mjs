import { readFileSync } from 'node:fs';
const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
// 用改前/改后两种正则各跑一遍，逐案比 starts 的 key 序列
function startsOf(text, mode){
  const s=[];
  const A = mode==='old' ? '^(\\d{1,2})(-附)?[.．]?\\s*'+NAME+'：' : '^(\\d{1,2})(-附|[.．])\\s*'+NAME+'：';
  for (const m of text.matchAll(new RegExp(A,'gm'))) s.push({i:m.index,key:m[3]});
  for (const m of text.matchAll(new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*'+NAME+'\\*\\*\\s*$','gm'))) s.push({i:m.index,key:m[3]});
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*'+NAME+'\\*\\*\\s*[：:]','gm'))) s.push({i:m.index,key:m[3]});
  s.sort((a,b)=>a.i-b.i);
  return s;
}
const changed=[];
for (let i=1;i<=30;i++){
  const id='S'+String(i).padStart(2,'0');
  const t=readFileSync('prototypes/_specs/'+id+'.md','utf8');
  const o=startsOf(t,'old'), n=startsOf(t,'new');
  const ko=JSON.stringify(o.map(x=>x.key)), kn=JSON.stringify(n.map(x=>x.key));
  if(ko!==kn) changed.push(id+' starts '+o.length+'→'+n.length);
}
console.log('starts 序列发生变化的案:', changed.length?changed.join(' | '):'（无）');
