/* 改写校验器：对 5 段样本逐条打分，判据与闸门候选一致 */
import fs from 'fs';

const R = JSON.parse(fs.readFileSync('deliverables/78-northstar/_probe/_audit-rewrites/rewrites.json','utf8'));

const CLAUSE = /C-\d+(?:\.\d+)?|C-\d+\s*第\s*\d+\s*条|R-\d+|P\d+|0\d-[a-z-]+\.md/g;
/* 负面措辞：与 _audit-field-decision.mjs 的 NEG 同源，另加本仓库实际出现的变体 */
const NEG = /反\s*C-|反\s*0[0-9]-|反「|不使用|不存在|禁止|不要|没有|零\s*[a-z-]|而不是|不靠|而非|不设|不做|不用|不得|不许|无纯|不参与|跳脱之处/g;

function score(id, txt){
  const clause = txt.match(CLAUSE) || [];
  const neg = txt.match(NEG) || [];
  return {id, len:txt.length, clause:clause.length, clauseList:clause, neg:neg.length, negList:neg};
}

let fail=0;
console.log('=== 改写后逐段校验 ===\n');
const rows=[];
for(const [id,o] of Object.entries(R)){
  const b=score(id,o.before), a=score(id,o.after);
  rows.push({id,f:o.family,b,a});
  console.log(`[${id}] 族${o.family}  字数 ${b.len} → ${a.len} (${((a.len/b.len-1)*100).toFixed(0)}%)`);
  console.log(`  条款编号 ${b.clause} → ${a.clause}  ${a.clause?'❌ 残留: '+a.clauseList.join(' '):'✅'}`);
  console.log(`  负面措辞 ${b.neg} → ${a.neg}  ${a.neg?'❌ 残留: '+a.negList.join(' '):'✅'}`);
  if(a.clause||a.neg) fail++;
  console.log('');
}
console.log(fail? `❌ ${fail} 段未通过`:'✅ 5/5 通过（0 条款编号、0 负面措辞）');

/* 信息守恒：before 里的设计值在 after 里还在不在 */
console.log('\n=== 信息守恒：before 的具体值是否都搬到了 after ===');
const VAL=/#[0-9A-Fa-f]{6}\b|\d+(?:\.\d+)?\s*(?:px|mm|%|°|ms|级|档|栏|条|枚|张|个|行|格)/g;
const BAN_TARGET=/^#FFFFFF$|^#000000$/i;
let lost=0;
for(const [id,o] of Object.entries(R)){
  const bv=[...new Set((o.before.match(VAL)||[]).map(v=>v.replace(/\s/g,'').toUpperCase()))];
  const av=o.after.replace(/\s/g,'').toUpperCase();
  const miss=bv.filter(v=>!av.includes(v));
  const realMiss=miss.filter(v=>!BAN_TARGET.test(v));
  if(realMiss.length){lost++; console.log(`  ${id} ❌ 丢失: ${realMiss.join(' ')}`);}
  else console.log(`  ${id} ✅ 全在（含"被禁靶值"${miss.filter(v=>BAN_TARGET.test(v)).join(' ')||'无'}，那是应删的）`);
}
console.log(lost?`\n❌ ${lost} 段有真实信息丢失`:'\n✅ 5/5 信息守恒（只删掉了 #FFFFFF/#000000 这类靶值）');

/* 跳脱之处这类"设计意图"必须保留 */
console.log('\n=== 设计意图（跳脱之处 → 正面陈述）是否保留 ===');
for(const [id,o] of Object.entries(R)){
  const bJ=(o.before.match(/跳脱之处/g)||[]).length;
  const bIntent = bJ>0;
  /* after 里没有"跳脱之处"字样是对的，但意图句要在 */
  const hasWhy = /：.*(?:视线|读起|来源|出处|本身|始终|始终|压满|平的|切断)/.test(o.after) || o.after.split('。').length>=3;
  console.log(`  ${id} ${bIntent?'有':'无'}跳脱(${bJ}) → after ${o.after.split('。').filter(Boolean).length} 个陈述句，意图句 ${hasWhy?'在':'⚠️ 需人工核'}`);
}
