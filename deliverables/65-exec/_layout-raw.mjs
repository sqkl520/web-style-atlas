import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const B=load('prototypes/_selection/data.js');
const dec=(s)=>s.replace(/\*\*/g,'').replace(/`/g,'').replace(/\s+/g,' ').trim();
for (const id of ['S12','S15','S19']) {
  const md=readFileSync('prototypes/_specs/'+id+'.md','utf8');
  // 原始字段 5 正文：从 **5. 布局与网格** 之后到下一个 **6. 关键视觉元素 之前
  const m=/\*\*5[.．]\s*布局与网格\*\*([\s\S]*?)(?=\*\*6[.．])/.exec(md);
  const raw=dec(m[1]);
  const got=B.find(x=>x.id===id).layout;
  console.log(id, '原文', raw.length, '字｜data.js', got.length, '字｜原文是 data.js 的前缀:', raw.startsWith(got.slice(0,300)), '｜完整包含:', raw===got || got.startsWith(raw.slice(0,200)));
  if(raw!==got){
    console.log('  原文尾部:', JSON.stringify(raw.slice(-120)));
    console.log('  数据尾部:', JSON.stringify(got.slice(-120)));
  }
}
