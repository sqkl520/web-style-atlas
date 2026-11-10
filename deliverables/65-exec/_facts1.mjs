import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('prototypes/_selection/data.js','utf8');
const json = src.replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,'');
const S = JSON.parse(json);
console.log('案数', S.length);
console.log('记录键:', Object.keys(S[0]).join(', '));
for (const k of ['audit','mechanism','mechanisms','mechanismNote']) console.log('有 '+k+' 的案:', S.filter(r=>r[k]!==undefined).length);
// audit 是否存在
const anyAudit = S.some(r=>'audit' in r);
console.log('data.js 里存在 audit 键:', anyAudit);
// 全库搜索 "去 AI 味审查点" 文本是否出现在任何字段
let hit=0; for (const r of S) for (const [k,v] of Object.entries(r)) if (typeof v==='string' && v.includes('去 AI 味审查点')) { hit++; console.log('命中', r.id, k, v.slice(0,40)); }
console.log('字段值里出现「去 AI 味审查点」字样:', hit);
// 各字段非空统计
for (const k of ['def','family','fonts','layout','visuals','motion','risk','landing','scenes','quirk','copy','mechanism']) {
  const n = S.filter(r=>typeof r[k]==='string' && r[k].length>0).length;
  const chars = S.reduce((a,r)=>a+(typeof r[k]==='string'?r[k].length:0),0);
  console.log(k.padEnd(10), '非空', String(n).padStart(2)+'/30', '总字数', chars);
}
