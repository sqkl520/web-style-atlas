/* 机械剥离原型：只做"删前缀 / 删对照子句"，不做语义重写。
 * 目的不是产出最终文案，而是量化「机械能做到多少、剩下多少必须人工」。 */
import fs from 'fs'; import vm from 'vm';
globalThis.window={}; vm.runInThisContext(fs.readFileSync('prototypes/_selection/data.js','utf8'));
const S=globalThis.window.SCHEMES;

const CLAUSE_PAT = [
  /C-\d(?:\.\d+)?(?:\s*第\s*\d+\s*条)?/,
  /R-\d+/,
  /P\d+/,
  /0\d-[a-z-]+\.md(\s*[A-Z]\s*节)?/,
];
const CLAUSE_ANY = new RegExp('(?:'+CLAUSE_PAT.map(r=>r.source).join('|')+')','g');

function family(a){
  if(/^①/.test(a))return 'A';
  if(/^（1）/.test(a)&&/→/.test(a))return 'D';
  if(/^（1）/.test(a))return 'C';
  if(/^第一/.test(a))return 'B';
  return '?';
}
function splitItems(a,f){
  if(f==='A') return a.split(/(?=[①②③④⑤⑥⑦⑧⑨])/).filter(Boolean);
  if(f==='C'||f==='D') return a.split(/(?=（\d）)/).filter(Boolean);
  return a.split(/(?=第[一二三四五]，)/).filter(Boolean);
}

/* 每条：剥掉「反 <条款>[「…」|（…）][：|——]」这一段 */
function stripHead(item,f){
  let t=item;
  /* 去掉序号 */
  t=t.replace(/^[①②③④⑤⑥⑦⑧⑨]|^（\d+）|^第[一二三四五]，/,'');
  /* 族 A：它故意反 <clause list>—— */
  t=t.replace(/^它故意反(?:的是)?\s*(?:(?:C-\d(?:\.\d+)?|R-\d+|P\d+|0\d-[a-z-]+\.md|与|和|、|\s|节|第\s*\d+\s*条)+)[—→:：]{1,2}\s*/,'');
  /* 族 B/C/D：反 <clause>「…」： / 反 <clause>（…）： */
  t=t.replace(/^反\s*(?:(?:C-\d(?:\.\d+)?|R-\d+|P\d+|0\d-[a-z-]+\.md|与|和|、|\s|节|第\s*\d+\s*条|"[^"]*")+?)[「（][^」）]*[」）]\s*[:：—→]{1,2}\s*/,'');
  t=t.replace(/^反\s*(?:(?:C-\d(?:\.\d+)?|R-\d+|P\d+|0\d-[a-z-]+\.md|与|和|、|\s|节|第\s*\d+\s*条)+?)\s*[:：—→]{1,2}\s*/,'');
  return t.trim();
}
/* 删「不是 X，而是」「X 而非 Y」「而不是」「不靠…靠…」这类对照 */
function stripContrast(t){
  return t
    .replace(/[^，；。]*?不是[^，；。]*?，而是\s*/g,'')
    .replace(/不是[^，；。]*?，而是\s*/g,'')
    .replace(/([^，；。]*?)\s*而非\s*[^，；。]*?(?=[，；。])/g,'$1')
    .replace(/而不是[^，；。]*?(?=[，；。])/g,'')
    .replace(/，?不靠[^，；。]*?/g,'');
}

const NEG=['不使用','不存在','禁止','不要','没有','零','而非','而不是','不靠','不写','不设','不做','不用','不得','不许','无纯','不参与','反'];
const negCount=t=>NEG.reduce((a,k)=>a+(t.split(k).length-1),0);

let beforeNeg=0, afterNeg=0, beforeClause=0, afterClause=0, beforeLen=0, afterLen=0, residual=[];
const out=[];
for(const x of S){
  const a=x.audit||''; const f=family(a);
  beforeNeg+=negCount(a); afterLen+=0;
  beforeClause+=(a.match(CLAUSE_ANY)||[]).length; beforeLen+=a.length;
  const items=splitItems(a,f).map(it=>{
    let t=stripHead(it,f);
    t=t.split(/[；;]?\s*跳脱之处(?:在于|是)?[：:]?/).join('｜');
    t=stripContrast(t);
    return t.replace(/[，；]\s*$/,'').replace(/｜/g,'；效果：');
  });
  const rebuilt=items.join('。')+'。';
  afterNeg+=negCount(rebuilt);
  afterClause+=(rebuilt.match(CLAUSE_ANY)||[]).length; afterLen+=rebuilt.length;
  const r=negCount(rebuilt);
  if(r) residual.push({id:x.id,f,n:r,txt:rebuilt.match(new RegExp('(?:.{0,14})(?:'+NEG.join('|')+')(?:.{0,14})','g'))});
  out.push({id:x.id,f,rebuilt});
}

console.log('=== 机械剥离后残留 ===');
console.log(`字数   ${beforeLen} → ${afterLen}  (${((afterLen/beforeLen-1)*100).toFixed(1)}%)`);
console.log(`条款编号 ${beforeClause} → ${afterClause}`);
console.log(`负面措辞 ${beforeNeg} → ${afterNeg}   去掉 ${beforeNeg-afterNeg} (${((beforeNeg-afterNeg)/beforeNeg*100).toFixed(0)}%)`);
console.log(`\n仍含负面的案 ${residual.length}/35：`);
for(const r of residual) console.log(`  ${r.id} 残留${r.n}处：${(r.txt||[]).map(s=>s.trim()).join(' ‖ ')}`);

console.log('\n=== 机械剥离后全文（前 4 案示例）===');
for(const o of out.slice(0,4)) console.log(`\n[${o.id} 族${o.f}]\n${o.rebuilt}`);

fs.writeFileSync('deliverables/78-northstar/_probe/_audit-mech-out.json',JSON.stringify(out,null,1));
