import { readFileSync } from 'node:fs';
const FIELDS = ['一句话视觉定义','机制','美学家族与参考','配色系统','字体策略','布局与网格','关键视觉元素','动效与交互','去 AI 味审查点','反 AI 味风险与规避','适用场景','可落地要点','设计师签名式怪癖'];
for (const id of ['S12','S15','S19']) {
  const text = readFileSync('prototypes/_specs/'+id+'.md','utf8');
  const starts = [];
  const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '：', 'gm'))) starts.push({i:m.index,key:m[3],kind:'A'});
  for (const m of text.matchAll(new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '\\*\\*\\s*$', 'gm'))) starts.push({i:m.index,key:m[3],kind:'B'});
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*' + NAME + '\\*\\*\\s*[：:]', 'gm'))) starts.push({i:m.index,key:m[3],kind:'C'});
  starts.sort((a,b)=>a.i-b.i);
  console.log('===== '+id);
  for (const s of starts) console.log(s.kind, s.i, JSON.stringify(s.key));
}
