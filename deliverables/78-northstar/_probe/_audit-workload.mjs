/* 工作量模型：每案需要多少次"句子级判断"，以及哪些能脚本批量 */
import fs from 'fs'; import vm from 'vm';
globalThis.window={}; vm.runInThisContext(fs.readFileSync('prototypes/_selection/data.js','utf8'));
const S=globalThis.window.SCHEMES;

const CLAUSE=/C-\d(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+|0\d-[a-z-]+\.md(?:\s*[A-Z]\s*节)?|与\s*\d{1,2}\s*号/g;
const JUMP=/跳脱之处/g;
const VOCAB=['居中大标题','等宽卡片','等宽三卡','三等宽','三张等宽','图标罗列','图标网格','图标格子','圆角','柔和投影','浮起','渐变','插值','球体','流体金属','毛玻璃','吸顶','玻璃卡片','噪点','白灰交替','交替分区','#FFFFFF','#000000','纯白','纯黑','星级','头像','闪烁光标','完美居中','发光','视差','轮播'];
const QUOTE=/「[^」]{3,40}」/g;

const rows=[];
for(const x of S){
  const a=x.audit||'';
  const items=/^①/.test(a)?(a.match(/[①②③④⑤⑥⑦⑧⑨]/g)||[]).length
    :/^（1）/.test(a)?(a.match(/（\d）/g)||[]).length
    :(a.match(/第[一二三四五]，/g)||[]).length;
  const clause=(a.match(CLAUSE)||[]).length;
  const jump=(a.match(JUMP)||[]).length;
  const inlineHit=(a.replace(/「[^」]*」/g,' ').match(/不是[^，；。]{4,50}?，而是|[^，；。]{4,40}?\s*而非\s*[^，；。]{4,40}/g)||[]).filter(c=>VOCAB.some(v=>c.includes(v))).length;
  const quotes=(a.match(QUOTE)||[]).length;
  /* 判断点 = 每条要重写前缀(1) + 每个跳脱之处要转写(1) + 每处无引号点名要判断(1) + 引号要判断是否叙事(0.3) */
  const points = items + jump + inlineHit + Math.round(quotes*0.3);
  rows.push({id:x.id,len:a.length,items,clause,jump,inlineHit,quotes,points});
}
const pad=(s,n)=>String(s).padEnd(n);
console.log(pad('id',5)+pad('字',5)+pad('条',4)+pad('条款',5)+pad('跳脱',5)+pad('无引号点名',8)+pad('引号',5)+'判断点');
let tp=0;
for(const r of rows){ tp+=r.points; console.log(pad(r.id,5)+pad(r.len,5)+pad(r.items,4)+pad(r.clause,5)+pad(r.jump,5)+pad(r.inlineHit,8)+pad(r.quotes,5)+r.points); }
console.log(`\n合判断点 ${tp}，平均 ${(tp/35).toFixed(1)}/案`);

/* 分档 */
const buckets={'≤4（轻）':0,'5-7（中）':0,'8+（重）':0};
for(const r of rows){ if(r.points<=4)buckets['≤4（轻）']++; else if(r.points<=7)buckets['5-7（中）']++; else buckets['8+（重）']++; }
console.log('\n分档：');for(const [k,v] of Object.entries(buckets))console.log(`  ${k}: ${v} 案`);

/* 自动化边界 */
const autoClause=rows.reduce((a,b)=>a+b.clause,0);
const autoHead=rows.reduce((a,b)=>a+b.items,0);
const autoQuote=rows.reduce((a,b)=>a+b.quotes,0);
const manualJump=rows.reduce((a,b)=>a+b.jump,0);
const manualInline=rows.reduce((a,b)=>a+b.inlineHit,0);
console.log(`\n自动化边界：
  可脚本：删条款编号 ${autoClause} 处、删条目前缀（结构固定） ${autoHead} 处、引号内短语候选标记 ${autoQuote} 处
  必须人工：跳脱之处转写 ${manualJump} 处、无引号点名判断 ${manualInline} 处`);
