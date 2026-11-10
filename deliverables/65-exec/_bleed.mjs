import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const S=load('prototypes/_selection/data.js');
// 检测 audit 里是否混进别的小节标题（断点具体行为 / 三层硫酸纸 / 反套路 / 放弃常规导航）
const SUS=['反套路改造三指标','断点具体行为','三层硫酸纸','放弃常规导航','透叠规则'];
for (const r of S){
  const hit=SUS.filter(s=>r.audit.includes(s));
  if(hit.length) console.log(r.id,'audit 混入:',hit.join(','),'长度',r.audit.length);
}
console.log('--- 各字段是否混入这些标题 ---');
for (const r of S){
  for (const k of ['def','family','fonts','layout','visuals','motion','audit','risk','landing','scenes','quirk']){
    const v=r[k]||''; const hit=SUS.filter(s=>v.includes(s));
    if(hit.length && k!=='audit') console.log(r.id+'.'+k,'混入',hit.join(','));
  }
}
