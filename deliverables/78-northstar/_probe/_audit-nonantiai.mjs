/* 精确分类 135 个条目：哪些压根不是"反 AI 味" */
import fs from 'fs';
const win={}; new Function('window', fs.readFileSync('prototypes/_selection/data.js','utf8'))(win);
const S=win.SCHEMES;

function items(a){
  if(/^①/.test(a)) return a.split(/(?=[①②③④⑤⑥⑦⑧⑨])/).filter(Boolean);
  if(/^（1）/.test(a)) return a.split(/(?=（\d）)/).filter(Boolean);
  return a.split(/(?=第[一二三四五]，)/).filter(Boolean);
}
const CAT={cls:'反某个 C/R/P 条款', quote:'反一条无编号默认', iso:'方案间机制隔离', none:'无任何"反"'};
const rows=[];
for(const x of S) for(const it of items(x.audit||'')){
  const b=it.replace(/^[①②③④⑤⑥⑦⑧⑨]\s*|^（\d）\s*|^第[一二三四五]，\s*/,'');
  let cat;
  if(/机制隔离|与\s*\d{1,2}\s*号|和\s*\d{1,2}\s*号/.test(b)) cat='iso';
  else if(/反\s*(?:C-\d|R-\d|P\d|0\d-)/.test(b)) cat='cls';
  else if(/反「/.test(b)) cat='quote';
  else if(/反/.test(b)) cat='cls';
  else cat='none';
  rows.push({id:x.id,cat,txt:b.slice(0,60)});
}
console.log('总条目', rows.length);
for(const [k,label] of Object.entries(CAT)){
  const g=rows.filter(r=>r.cat===k);
  console.log(`${k.padEnd(6)} ${label.padEnd(20)} ${g.length} 条  案: ${[...new Set(g.map(r=>r.id))].join(' ')}`);
}
console.log('\n=== 无"反"的条目全文 ===');
for(const r of rows.filter(r=>r.cat==='none')) console.log('  '+r.id+': '+r.txt);
console.log('\n=== 机制隔离条目全文 ===');
for(const r of rows.filter(r=>r.cat==='iso')) console.log('  '+r.id+': '+r.txt);
