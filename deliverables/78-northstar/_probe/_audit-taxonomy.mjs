/* audit 字段的结构分类 + 信息重叠测量 */
import fs from 'fs';
import vm from 'vm';
globalThis.window = {};
vm.runInThisContext(fs.readFileSync('prototypes/_selection/data.js','utf8'));
const S = globalThis.window.SCHEMES;

const NEG_TOKENS = ['不使用','不存在','禁止','不要','没有','零','而非','而不是','不靠','不写','不设','不做','不用','不得','不许','无纯','不参与'];
const negCount = (t) => NEG_TOKENS.reduce((a,k)=>a+(t.match(new RegExp(k,'g'))||[]).length,0);
const CLAUSE = /C-\d(?:\.\d+| 第 \d+ 条)|R-\d+|P\d+|0\d-[a-z-]+\.md/g;

function family(a){
  if (/^①/.test(a)) return 'A';
  if (/^（1）/.test(a) && /→/.test(a)) return 'D';
  if (/^（1）/.test(a)) return 'C';
  if (/^第一/.test(a)) return 'B';
  return '?';
}
function itemMark(a){
  if (/^①/.test(a)) return '①圆圈';
  if (/^（1）/.test(a)) return '（1）全角括号';
  return '第一，中文序数';
}

const rows = S.map(x=>{
  const a = x.audit;
  const f = family(a);
  const jump = (a.match(/跳脱之处/g)||[]).length;
  const items = f==='A' ? (a.match(/[①②③④⑤⑥⑦⑧⑨]/g)||[]).length
             : f==='B' ? (a.match(/第[一二三四五六]，/g)||[]).length
             : (a.match(/（[1-9]）/g)||[]).length;
  const banName = (a.match(/「[^」]{4,40}」/g)||[]);
  return {id:x.id, len:a.length, f, mark:itemMark(a), items, jump,
    neg:negCount(a), clause:(a.match(CLAUSE)||[]).length,
    ban:banName.length, banList:banName};
});

const pad=(s,n)=>String(s).padEnd(n);
console.log(pad('id',5)+pad('len',5)+pad('族',4)+pad('条目序',14)+pad('条数',5)+pad('跳脱',5)+pad('负面',5)+pad('条款',5)+pad('扣名',5));
for(const r of rows) console.log(pad(r.id,5)+pad(r.len,5)+pad(r.f,4)+pad(r.mark,14)+pad(r.items,5)+pad(r.jump,5)+pad(r.neg,5)+pad(r.clause,5)+pad(r.ban,5));

console.log('\n=== 族统计 ===');
for (const f of ['A','B','C','D']) {
  const g = rows.filter(r=>r.f===f);
  if(!g.length) continue;
  const sum = (k)=>g.reduce((a,b)=>a+b[k],0);
  console.log(`族${f}: ${g.length} 案  ${g[0].mark}  字数和 ${sum('len')} (${Math.min(...g.map(r=>r.len))}-${Math.max(...g.map(r=>r.len))})  条数/案 ${[...new Set(g.map(r=>r.items))].join('/')}  跳脱案 ${g.filter(r=>r.jump>0).length}/${g.length}  负面 ${sum('neg')}  条款 ${sum('clause')}  「」扣名 ${sum('ban')}`);
  console.log('   ', g.map(r=>r.id).join(' '));
}
console.log('\n=== 用户假说对照 ===');
console.log('有跳脱之处:', rows.filter(r=>r.jump>0).length, rows.filter(r=>r.jump>0).map(r=>r.id).join(' '));
console.log('无跳脱之处且有「」:', rows.filter(r=>r.jump===0 && r.ban>0).length, rows.filter(r=>r.jump===0&&r.ban>0).map(r=>r.id).join(' '));
console.log('无跳脱之处且无「」:', rows.filter(r=>r.jump===0 && r.ban===0).length, rows.filter(r=>r.jump===0&&r.ban===0).map(r=>r.id).join(' '));
console.log('含"它故意反"字样:', rows.filter(r=>/它故意反/.test(S.find(s=>s.id===r.id).audit)).length);
console.log('总负面', rows.reduce((a,b)=>a+b.neg,0), ' 总条款', rows.reduce((a,b)=>a+b.clause,0), ' 「」扣名', rows.reduce((a,b)=>a+b.ban,0));
console.log('总字数', rows.reduce((a,b)=>a+b.len,0), ' 中位', [...rows.map(r=>r.len)].sort((a,b)=>a-b)[17]);

console.log('\n=== 「」里被点名的禁用做法全清单（这是要消失的那些词）===');
const allBan = {};
for(const r of rows) for(const b of r.banList){ allBan[b]=(allBan[b]||[]); allBan[b].push(r.id); }
for(const [k,v] of Object.entries(allBan)) console.log('  '+pad(k,44)+'  '+v.length+' 案 '+v.join(','));
