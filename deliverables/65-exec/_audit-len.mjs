import { readFileSync } from 'node:fs';
const FIELDS = ['一句话视觉定义','机制','美学家族与参考','配色系统','字体策略','布局与网格','关键视觉元素','动效与交互','去 AI 味审查点','反 AI 味风险与规避','适用场景','可落地要点','设计师签名式怪癖'];
const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
const tailRe = /^\s*(?:\*\*)?(?:真实上站文案|自评|版本|校验|审查)(?:\*\*)?\s*[：:]/m;
const dec = (s)=>s.replace(/\*\*/g,'').replace(/`/g,'').replace(/\s+/g,' ').trim();
let total=0; const rows=[];
for (let i=1;i<=30;i++){
  const id='S'+String(i).padStart(2,'0');
  const text=readFileSync('prototypes/_specs/'+id+'.md','utf8');
  const starts=[];
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*'+NAME+'：','gm'))) starts.push({i:m.index,end:m.index+m[0].length,key:m[3]});
  for (const m of text.matchAll(new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*'+NAME+'\\*\\*\\s*$','gm'))) starts.push({i:m.index,end:m.index+m[0].length,key:m[3]});
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*'+NAME+'\\*\\*\\s*[：:]','gm'))) starts.push({i:m.index,end:m.index+m[0].length,key:m[3]});
  starts.sort((a,b)=>a.i-b.i);
  const tailM=tailRe.exec(text.slice(starts.length?starts[0].i:0));
  const tailAbs=tailM&&starts.length?starts[0].i+tailM.index:text.length;
  const fields={};
  for (let k=0;k<starts.length;k++){
    const key=starts[k].key.replace(/（[^）]*）/g,'').trim();
    let to=k+1<starts.length?starts[k+1].i:tailAbs;
    if(to>tailAbs) to=tailAbs;
    const seg=text.slice(starts[k].end,to);
    if(key&&!fields[key]) fields[key]=dec(seg);
  }
  const a=fields['去 AI 味审查点']||'';
  total+=a.length;
  rows.push(`${id} ${String(a.length).padStart(4)} 机制:${(fields['机制']||'').length||'（无字段）'}`);
  if(!a) console.log('!!! 空 audit', id);
}
console.log(rows.join('\n'));
console.log('\n去 AI 味审查点 总字数（dec 后）:', total);
