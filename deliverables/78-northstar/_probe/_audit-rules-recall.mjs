/* 每条改写规则的"命中数" —— 规则必须是可机械执行的，所以要能报出它管到几处 */
import fs from 'fs'; import vm from 'vm';
globalThis.window={}; vm.runInThisContext(fs.readFileSync('prototypes/_selection/data.js','utf8'));
const S=globalThis.window.SCHEMES;

const RULES = [
  {id:'R1a', name:'删「它故意反 <条款>——」前缀（族A）', re:/①|②|③|④|⑤|⑥|⑦|⑧|⑨|它故意反(?:的是)?[^—→:：]{1,40}[—→:：]{1,2}/g, scope:'A/D'},
  {id:'R1b', name:'删「第N，反 <条款>「…」：」前缀（族B）', re:/第[一二三四五]，反\s*(?:C-\d[^：「]*|R-\d+|0\d-[a-z-]+\.md[^：]*)(?:「[^」]*」)?\s*[:：]/g, scope:'B'},
  {id:'R1c', name:'删「（N）反 <条款>（…）：」前缀（族C）', re:/（\d）反\s*[^（：]*（[^）]*）\s*[:：]/g, scope:'C'},
  {id:'R1d', name:'删「（N）它故意反的是 <条款>（…）→」（族D）', re:/（\d）它故意反的是[^→]*→\s*/g, scope:'D'},
  {id:'R2',  name:'删条款编号本身（术语层）', re:/C-\d(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+|0\d-[a-z-]+\.md(?:\s*[A-Z]\s*节)?/g, scope:'全'},
  {id:'R3',  name:'删内部案号（与N号…的机制隔离 整句）', re:/与\s*\d{1,2}\s*号[^。]*。/g, scope:'S18 S20'},
  {id:'R4',  name:'「跳脱之处是/：」→ 效果句重写', re:/跳脱之处(?:在于|是)?[：:]?\s*/g, scope:'27 案'},
  {id:'R5',  name:'删「X 而非 Y」的 X 半句，保留 Y', re:/[^，；。]*?\s*而非\s*/g, scope:'全'},
  {id:'R6',  name:'删「不是 X，而是」的 X 半句，保留 Y', re:/不是[^，；。]*?，而是\s*/g, scope:'全'},
  {id:'R7',  name:'删「不使用 #FFFFFF 与 #000000」→ 只留本案色值', re:/不使用\s*#FFFFFF\s*与\s*#000000|不使用纯白纯黑/g, scope:'A/B'},
];
const alloc=(id)=>{
  if(/^S(0[1-9]|10)$/.test(id))return 'A';
  if(/^S(11|12|13|14|15|16|17|18|19|20|31|32|33|34|35)$/.test(id))return 'B';
  if(/^S(21|23)$/.test(id))return 'C';
  return 'D';
};
console.log('规则                                        命中   覆盖案数');
for(const r of RULES){
  let n=0,cases=0;
  for(const x of S){
    const m=(x.audit||'').match(r.re);
    if(m){n+=m.length;cases++;}
  }
  console.log(`${r.id} ${r.name.padEnd(42)} ${String(n).padStart(4)}   ${cases}/35`);
}

/* 关键：R1a..R1d 合并后，是否每条都恰好命中它该管的族？ */
console.log('\n=== 族别归属核对（前四条每条必须只命中自己那一族）===');
const head=[RULES[0],RULES[1],RULES[2],RULES[3]];
const famOf={};
for(const x of S){
  const f=alloc(x.id);
  for(const r of head){
    const c=((x.audit||'').match(r.re)||[]).length;
    famOf[x.id]=famOf[x.id]||{};
    famOf[x.id][r.id]=c;
  }
}
for(const f of ['A','B','C','D']){
  const ids=S.filter(x=>alloc(x.id)===f).map(x=>x.id);
  console.log(`族${f} (${ids.length} 案):`);
  for(const r of head){
    const hit=ids.filter(id=>(famOf[id][r.id]||0)>0);
    console.log(`  ${r.id}: ${hit.length}/${ids.length} 案命中 ${hit.length&&hit.length<ids.length?'  ← 局部命中 '+hit.join(','):''}`);
  }
}
