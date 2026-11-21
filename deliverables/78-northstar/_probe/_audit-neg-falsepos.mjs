/* 负面措辞判据的假阳性率：把 35 段里每个负面词按上下文分类 */
import fs from 'fs'; import vm from 'vm';
globalThis.window={}; vm.runInThisContext(fs.readFileSync('prototypes/_selection/data.js','utf8'));
const S=globalThis.window.SCHEMES;
const NEG=/不使用|不存在|禁止|不要|没有|零|而非|而不是|不靠|不写|不设|不做|不用|不得|不许|无纯|不参与|反\s*C-|反「/g;

/* 人工可判的两类：
   HARM = 点名一个"被禁做法/默认做法"，会加权
   FACT = 描述本案实际状态（"没有一条对称轴""全页零图标"），是正面事实
*/
const KEEP = /(没有一条|没有任何|没有一处|全页零|零圆角|零图标|零 box|不存在任何|没有纯|无纯|没有一张|没有一条)/;

let harm=0, fact=0; const factSamples=[];
for(const x of S){
  const a=x.audit||'';
  let m;
  const re=new RegExp(NEG.source,'g');
  while((m=re.exec(a))){
    const ctx=a.slice(Math.max(0,m.index-16), Math.min(a.length,m.index+22));
    /* 判据：紧跟着"被禁做法"的模板句 = HARM；描述本案数值状态 = FACT */
    const isFact = KEEP.test(m[0]+ctx.slice(14,40)) || /^零/.test(m[0]);
    if(isFact){fact++; if(factSamples.length<14) factSamples.push(x.id+': …'+ctx.replace(/\n/g,' ')+'…');}
    else harm++;
  }
}
console.log(`全部负面词命中：${harm+fact} 处`);
console.log(`  HARM（点名被禁做法，会加权，必须删）：${harm}`);
console.log(`  FACT（描述本案"零/无"的状态，是正面事实，不该删）：${fact}`);
console.log(`  → 纯正则闸门的假阳性率 ${(fact/(harm+fact)*100).toFixed(0)}%`);
console.log('\nFACT 样本（这些删掉会真的丢信息）：');
for(const s of factSamples) console.log('  '+s);
