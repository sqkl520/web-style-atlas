/* 到底有多少条目压根不是"反 AI 味"，而是版式说明 / 方案间隔离 / 叙事？ */
import fs from 'fs';
const win={}; new Function('window', fs.readFileSync('prototypes/_selection/data.js','utf8'))(win);
const S=win.SCHEMES;

function items(a){
  if(/^①/.test(a)) return a.split(/(?=[①②③④⑤⑥⑦⑧⑨])/).filter(Boolean);
  if(/^（1）/.test(a)) return a.split(/(?=（\d）)/).filter(Boolean);
  return a.split(/(?=第[一二三四五]，)/).filter(Boolean);
}
let total=0;
const buckets={antiAI:[],isolation:[],layoutOnly:[],narrative:[]};
for(const x of S){
  for(const it of items(x.audit||'')){
    total++;
    const bare=it.replace(/^[①②③④⑤⑥⑦⑧⑨]|^（\d）|^第[一二三四五]，/,'');
    if(/机制隔离|与\s*\d{1,2}\s*号|和\s*\d{1,2}\s*号/.test(bare)) buckets.isolation.push(x.id+' :: '+bare.slice(0,80));
    else if(!/反\s*(?:C-|R-|P\d|0\d-)|反「|反文件/.test(bare)) buckets.layoutOnly.push(x.id+' :: '+bare.slice(0,80));
    else if(/^\s*反/.test(bare)===false) buckets.narrative.push(x.id+' :: '+bare.slice(0,80));
  }
}
console.log('总条目数', total);
for(const [k,v] of Object.entries(buckets)){
  console.log(`\n=== ${k}  ${v.length} 条 ===`);
  for(const s of v) console.log('  '+s);
}
