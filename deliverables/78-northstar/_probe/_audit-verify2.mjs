import fs from 'fs';
import vm from 'vm';
const R=JSON.parse(fs.readFileSync('deliverables/78-northstar/_probe/_audit-rewrites/rewrites.json','utf8'));

const CLAUSE=/C-\d+(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+|0\d-[a-z-]+\.md/g;
function stripBanned(t){
  return t
    .replace(/(?:反|它故意反(?:的是)?)\s*(?:(?:C-\d+(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+|0\d-[a-z-]+\.md|与|和|、|\s|的|第\s*\d+\s*条)+)(?:[（「][^））」]*[））」])?/g,' ')
    .replace(/反「[^」]*」(?:这条默认)?/g,' ');
}
const NEG=/反\s*C-|反\s*0[0-9]-|反「|不使用|不存在|禁止|不要|没有|零\s*[a-z-]|而不是|不靠|而非|不设|不做|不用|不得|不许|无纯|不参与|跳脱之处/g;
const VAL=/#[0-9A-Fa-f]{6}\b|\d+(?:\.\d+)?\s*(?:px|mm|%|°|ms|级|档)/g;
/* 被禁做法的靶值：改写后**应该**消失，不算损失 */
const BAN=/^#FFFFFF$|^#000000$|^24PX$/i;

console.log('id    族  字数(前→后)   条款   负面   设计值守恒（已排除靶值 #FFF/#000）');
let allOk=true;
for(const [id,o] of Object.entries(R)){
  const clauseB=(o.before.match(CLAUSE)||[]).length, clauseA=(o.after.match(CLAUSE)||[]).length;
  const negB=(o.before.match(NEG)||[]).length, negA=(o.after.match(NEG)||[]).length;
  const bv=[...new Set((stripBanned(o.before).match(VAL)||[]).map(v=>v.replace(/\s/g,'').toUpperCase()))].filter(v=>!BAN.test(v));
  const av=o.after.replace(/\s/g,'').toUpperCase();
  const miss=bv.filter(v=>!av.includes(v));
  const ok=clauseA===0&&negA===0&&miss.length===0;
  if(!ok)allOk=false;
  console.log(`${id}   ${o.family}  ${String(o.before.length).padStart(3)}→${String(o.after.length).padStart(3)}   ${clauseB}→${clauseA}   ${negB}→${negA}   ${ok?'✅':'❌ 丢:'+miss.join(' ')}  (正面值 ${bv.length} 个)`);
}
console.log('\n'+(allOk?'✅ 5/5 全过：0 条款编号 / 0 负面措辞 / 0 正面设计值丢失':'❌ 有未通过项'));

console.log('\n=== 反向自测：校验器喂原 audit 必须 35/35 判不合格 ===');
globalThis.window={};
vm.runInThisContext(fs.readFileSync('prototypes/_selection/data.js','utf8'));
const S=globalThis.window.SCHEMES;
let caught=0;
for(const x of S){ const a=x.audit||''; if((a.match(CLAUSE)||[]).length>0||(a.match(NEG)||[]).length>0) caught++; }
console.log(`  判不合格 ${caught}/35  ${caught===35?'✅ 能抓住全部':'❌ 有漏'}`);

console.log('\n=== 变异自测：往改写后的文本里注入一处负面，必须被抓到 ===');
const probe = R.S01.after.replace('纸面是平的','不要做成浮起的卡片');
const neg=(probe.match(NEG)||[]);
console.log(`  注入「不要做成浮起的卡片」→ 命中 ${neg.length} 处 ${neg.join(' ')}  ${neg.length?'✅':'❌ 漏检'}`);
const probe2 = R.S26.after.replace('全站圆角 0','全站圆角 0（反 C-2 第 11 条）');
const neg2=(probe2.match(NEG)||[]), cl2=(probe2.match(CLAUSE)||[]);
console.log(`  注入「反 C-2 第 11 条」→ 负面 ${neg2.length} 处、条款 ${cl2.length} 处  ${neg2.length&&cl2.length?'✅':'❌ 漏检'}`);
