/* 机制隔离 vs 版式说明：这两类"不是反 AI 味"的内容，各占多少字数？
 * 以及 S13/S17 尾部那两条"本方案不写『极简』"属于哪一类？ */
import fs from 'fs';
const win={}; new Function('window', fs.readFileSync('prototypes/_selection/data.js','utf8'))(win);
const S=win.SCHEMES;
function items(a){
  if(/^①/.test(a)) return a.split(/(?=[①②③④⑤⑥⑦⑧⑨])/).filter(Boolean);
  if(/^（1）/.test(a)) return a.split(/(?=（\d）)/).filter(Boolean);
  return a.split(/(?=第[一二三四五]，)/).filter(Boolean);
}
const iso=[], meta=[], layout=[];
for(const x of S) for(const it of items(x.audit||'')){
  const b=it.replace(/^[①②③④⑤⑥⑦⑧⑨]\s*|^（\d）\s*|^第[一二三四五]，\s*/,'');
  if(/机制隔离/.test(b)) iso.push([x.id,b]);
  else if(/不写「|不写\"|这类形容|这类默认/.test(b)) meta.push([x.id,b]);
  else if(/^(?:全站|全部|全页|主视觉|页面|首屏|底色|背景|纸底|三色|离型纸|图标|斜栏|三区)/.test(b) && !/反/.test(b.slice(0,4))) layout.push([x.id,b]);
}
const sum=a=>a.reduce((s,[,t])=>s+t.length,0);
console.log(`机制隔离  ${iso.length} 条 / ${sum(iso)} 字`);
for(const [id,t] of iso) console.log(`  ${id}: ${t}`);
console.log(`\n"不写某类形容词/反某条无编号默认"  ${meta.length} 条 / ${sum(meta)} 字`);
for(const [id,t] of meta) console.log(`  ${id}: ${t}`);
