import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const S=load('prototypes/_selection/data.js');
// 13 案：字段 3 里是否有「按钮字色」的直接陈述（白字/黑字/文字必须用/按钮底）
for (const r of S){
  if (r.buttonText) continue;
  const md=readFileSync('prototypes/_specs/'+r.id+'.md','utf8');
  const m=/\*\*3[.．]\s*配色系统\*\*([\s\S]*?)(?=\*\*4[.．]|\*\*3-附|$)/.exec(md);
  const p3=(m?m[1]:'').replace(/\s+/g,' ');
  const hits=[...p3.matchAll(/[^；。]{0,30}(白字|黑字|按钮|文字必须用|文字指定)[^；。]{0,50}/g)].map(x=>x[0].trim());
  console.log('--- '+r.id+' 字段3 里与按钮字色有关的从句 ('+hits.length+') ---');
  for (const h of hits) console.log('   · '+h);
}
