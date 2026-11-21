/* 去掉条款编号后，audit 里真正独有的设计值 */
import fs from 'fs';
import vm from 'vm';
globalThis.window = {};
vm.runInThisContext(fs.readFileSync('prototypes/_selection/data.js','utf8'));
const S = globalThis.window.SCHEMES;

const CLAUSE = /C-\d(?:\.\d+| 第 \d+ 条)?|R-\d+|P\d+|0\d-[a-z-]+\.md|（\d+）|第[一二三四五六七八九十]，?/g;
const VAL = /#[0-9A-Fa-f]{6}\b|\d+(?:\.\d+)?\s*(?:px|mm|%|°|ms|s|级|档)/g;

function clean(t){ return t.replace(CLAUSE,' '); }
function vals(t){ return [...new Set((clean(t).match(VAL)||[]).map(v=>v.replace(/\s/g,'').toUpperCase()))]; }

let tot=0, uniqTot=0;
const onlyList=[];
for(const x of S){
  const a=x.audit||'';
  let other='';
  for(const k of Object.keys(x)){ if(k==='audit')continue; const v=x[k];
    if(typeof v==='string') other+=v+'\n';
    else if(v&&typeof v==='object') for(const k2 in v) if(typeof v[k2]==='string') other+=v[k2]+'\n'; }
  const otherU = other.toUpperCase();
  const ov=vals(a);
  const uniq=ov.filter(v=>!otherU.includes(v));
  tot+=ov.length; uniqTot+=uniq.length;
  if(uniq.length) onlyList.push(x.id+': '+uniq.join(' '));
}
console.log(`去掉条款编号后：audit 里 ${tot} 个设计值，${uniqTot} 个在本案其它字段找不到`);
console.log('\n独有值清单：');
for(const l of onlyList) console.log('  '+l);

/* 另一类独有信息：不是数字，是"结构决定"。比如 S02 第5级留空、S19 2个空抽屉、S13 7条与4条两段 */
console.log('\n=== 非数字型独有信息（人工识别，改写必须保留）===');
const PHENOMENA = [
  ['S02','第 5 级故意留空并写明空缺原因','void token 唯一来源'],
  ['S19','刻意留 2 个空抽屉并在标签上写明「1889 年迁库时借出，位置照留」','void token 唯一来源 + 叙事'],
  ['S13','条款条目数量为 7 条与 4 条两段而非 3 / 6 / 9','计数结构'],
  ['S14','标贴共 11 枚且尺寸按 24 / 40 / 72 / 120px 分四档','数量+档位'],
  ['S15','热区共 14 个且面积按舱室真实面积等比','数量+规则'],
  ['S19','抽屉共 20 个，宽度取 4 / 3 / 3 / 2 栏四种值','数量+比例'],
  ['S30','离型纸 #EDEDED（R=G=B=237、饱和度 0%）','色值+属性'],
  ['S32','白字在这个紫上只有 3.1:1，本页用深紫墨（5.98:1）','对比度计算'],
  ['S31','最长的一格比最短的一格高 62px','差量'],
  ['S17','明细行数量随账期变化（示例为 27 行）','数量+可变性'],
];
for(const [id,txt,why] of PHENOMENA){
  const a=(S.find(s=>s.id===id)||{}).audit||'';
  const ok = a.includes(txt) || a.replace(/\s/g,'').includes(txt.replace(/\s/g,''));
  console.log(`  ${id} [${ok?'原文命中':'⚠️ 措辞不同，需人工核'}]  ${txt}   — ${why}`);
}
