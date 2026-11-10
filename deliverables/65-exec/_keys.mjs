import { readFileSync } from 'node:fs';
const FIELDS = ['一句话视觉定义','机制','美学家族与参考','配色系统','字体策略','布局与网格','关键视觉元素','动效与交互','去 AI 味审查点','反 AI 味风险与规避','适用场景','可落地要点','设计师签名式怪癖'];
const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
const all=[];
for (let i=1;i<=30;i++){
  const id='S'+String(i).padStart(2,'0');
  const text=readFileSync('prototypes/_specs/'+id+'.md','utf8');
  const starts=[];
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*'+NAME+'：','gm'))) starts.push({i:m.index,key:m[3],kind:'A'});
  for (const m of text.matchAll(new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*'+NAME+'\\*\\*\\s*$','gm'))) starts.push({i:m.index,key:m[3],kind:'B'});
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*'+NAME+'\\*\\*\\s*[：:]','gm'))) starts.push({i:m.index,key:m[3],kind:'C'});
  starts.sort((a,b)=>a.i-b.i);
  const keys=starts.map(s=>s.key.replace(/（[^）]*）/g,'').trim());
  const bad=keys.filter(k=>!FIELDS.includes(k));
  all.push({id, n:starts.length, bad, kinds:starts.map(s=>s.kind).join('')});
  console.log(id, 'starts='+starts.length, 'badKeys='+JSON.stringify(bad), 'kinds='+starts.map(s=>s.kind).join(''));
}
console.log('\n=== 30 案中所有 key（去重）===');
