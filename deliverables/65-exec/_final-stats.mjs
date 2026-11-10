import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const S=load('prototypes/_selection/data.js');
const a=S.map(r=>r.audit.length).sort((x,y)=>x-y);
console.log('audit 长度：min',a[0],'中位',a[15],'max',a[a.length-1],'总计',a.reduce((x,y)=>x+y,0));
console.log('audit 最长的 3 案:', S.slice().sort((x,y)=>y.audit.length-x.audit.length).slice(0,3).map(r=>r.id+':'+r.audit.length).join(' '));
// S13 的 audit 是否混入了 3-附
const s13=S.find(r=>r.id==='S13');
console.log('S13 audit 含「反套路改造三指标」:', s13.audit.includes('反套路改造三指标'));
console.log('S03/S08 的 配色系统 尾部:', JSON.stringify(S.find(r=>r.id==='S03').family.slice(0,20)));
// 直接看 S03 字段3 是否被 3-附 截断：比较 md 原文
for (const id of ['S03','S08']) {
  const md=readFileSync('prototypes/_specs/'+id+'.md','utf8');
  const m=/\*\*3[.．]\s*配色系统\*\*([\s\S]*?)(?=\*\*3-附)/.exec(md);
  console.log(id,'md 字段3 原文长度', m?m[1].replace(/\s+/g,' ').trim().length:'(匹配失败)');
}
