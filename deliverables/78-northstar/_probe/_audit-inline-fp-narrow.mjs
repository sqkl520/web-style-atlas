/* 收窄判据：只用「不是 X，而是」与「X 而非 Y」两种对照结构（这是"点名被禁做法"最强的信号），
 * 测真实正面文本上的假阳性率，以及原 audit 上的召回率。 */
import fs from 'fs'; import vm from 'vm';
globalThis.window={}; vm.runInThisContext(fs.readFileSync('prototypes/_selection/data.js','utf8'));
const S=globalThis.window.SCHEMES;
const BANNED=['居中大标题','等宽卡片','等宽三卡','三等宽','三张等宽','图标罗列','图标网格','图标格子','圆角','柔和投影','浮起','渐变','插值','球体','流体金属','毛玻璃','吸顶','玻璃卡片','噪点','白灰交替','交替分区','#FFFFFF','#000000','纯白','纯黑','星级','头像','闪烁光标','完美居中','发光','视差','轮播'];

function narrow(a){
  const t=a.replace(/「[^」]*」/g,' ').replace(/C-\d+(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+|0\d-[a-z-]+\.md|[0-9]{1,2}\s*号|文件\s*[0-9]{2}/g,' ');
  const out=[];
  let m;
  const R1=/不是([^，；。]{4,50}?)(?=，而是|；|。)/g;
  while((m=R1.exec(t))) out.push(m[1].trim());
  const R2=/([^，；。]{4,40}?)\s*而非\s*([^，；。]{4,40})/g;
  while((m=R2.exec(t))) { out.push(m[1].trim()); out.push(m[2].trim()); }
  return out;
}

/* 1) 真实正面文本上的 FP */
let tot=0,fp=0;const fpL=[];
for(const x of S) for(const k of ['layout','visuals','quirk','def','family']){
  const v=x[k]; if(typeof v!=='string')continue;
  for(const c of narrow(v)){tot++; if(BANNED.some(b=>c.includes(b))){fp++;if(fpL.length<10)fpL.push(x.id+'.'+k+': '+c);}}
}
console.log(`真实正面文本：${tot} 处从句，误判 ${fp} 处 = ${(fp/tot*100).toFixed(0)}%`);
for(const s of fpL) console.log('   '+s);

/* 2) 原 audit 上的召回 */
let hit=0, cases=0;
for(const x of S){
  const h=narrow(x.audit||'').filter(c=>BANNED.some(b=>c.includes(b)));
  if(h.length){cases++;hit+=h.length;}
}
console.log(`\n原 audit：${cases}/35 案被这条判据抓到含靶词，共 ${hit} 处`);
console.log(`  → 抓不到的 ${35-cases} 案靠 L1（条款编号）与标记词兜底`);

/* 3) 5 段改写稿上必须 0 */
import('fs').then(fs2=>{
  const R=JSON.parse(fs2.readFileSync('deliverables/78-northstar/_probe/_audit-rewrites/rewrites.json','utf8'));
  let bad=0;
  for(const [id,o] of Object.entries(R)) if(narrow(o.after).some(c=>BANNED.some(b=>c.includes(b)))) bad++;
  console.log(`\n5 段改写稿：${bad} 段误判  ${bad?'❌':'✅ 收窄判据在改写稿上零误判'}`);
});
