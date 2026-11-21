/* L2 内联点名 vs L3 正面事实：用"被禁做法词表"能否分开？ */
import fs from 'fs'; import vm from 'vm';
globalThis.window={}; vm.runInThisContext(fs.readFileSync('prototypes/_selection/data.js','utf8'));
const S=globalThis.window.SCHEMES;

/* 词表取自 02-anti-ai-rules.md §1.2 的五组默认值 + audit 里实际出现的靶值。
 * 判据：内联从句里**含具体靶词** → HARM；只含抽象判断词 → FACT。 */
const BANNED_VOCAB = [
  '居中大标题','等宽卡片','等宽三卡','三等宽','三张等宽','hero','图标罗列','图标网格','图标格子',
  '圆角','柔和投影','浮起','投影','渐变','插值','球体','流体金属','毛玻璃','吸顶','玻璃卡片','噪点',
  '白灰交替','交替分区','#FFFFFF','#000000','纯白','纯黑','emoji','Emoji','星级','头像','闪烁光标','打字机',
  '完美居中','发光','视差','轮播','3D',
];
const FACT_VOCAB = ['画出来的','屏幕原色','屏幕色卡','功能缺项','版式游戏','被修掉的缺陷','一块屏幕','渲染出来的','算出来的','设计者挑的','叠出来的'];

const CLAUSE=/C-\d+(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+|0\d-[a-z-]+\.md|[0-9]{1,2}\s*号|方案\s*[0-9]{1,2}|文件\s*[0-9]{2}/g;
function inlineClauses(a){
  const t=a.replace(CLAUSE,' ').replace(/「[^」]*」/g,' ');
  const out=[]; const PATS=[
    /不是([^，；。]{4,50}?)(?=，而是|；|。)/g, /([^，；。]{4,50}?)\s*而非\s*/g,
    /不(?:用|靠|设|做|要)([^，；。]{4,50}?)(?=[；。，])/g,
    /既没有([^，；。]{4,50}?)(?=[，；。])/g, /没有([^，；。]{4,40}?)(?=[；。])/g,
  ];
  for(const re of PATS){let m;while((m=re.exec(t))){const x=(m[1]||m[0]).trim();if(x.length>=4)out.push(x);}}
  return out;
}
let harm=0,fact=0,amb=0; const ambS=[],harmS=[];
for(const x of S){
  for(const c of inlineClauses(x.audit||'')){
    const isB=BANNED_VOCAB.some(v=>c.includes(v));
    const isF=FACT_VOCAB.some(v=>c.includes(v));
    if(isB&&!isF){harm++;harmS.push(x.id+': '+c);}
    else if(isF&&!isB){fact++;}
    else {amb++;ambS.push(x.id+': '+c);}
  }
}
console.log(`内联从句分类（${harm+fact+amb} 处）`);
console.log(`  HARM 含具体靶词，必须删：${harm}`);
console.log(`  FACT 只含抽象判断，可留：${fact}`);
console.log(`  歧义（两者都含或都不含）：${amb}  ← 词表判不动的部分`);
console.log(`\n  → 词表能自动分类 ${((harm+fact)/(harm+fact+amb)*100).toFixed(0)}%，剩 ${amb} 处必须人工`);
console.log('\nHARM 样本：'); for(const s of harmS.slice(0,12)) console.log('  '+s);
console.log('\n歧义样本：'); for(const s of ambS.slice(0,16)) console.log('  '+s);
