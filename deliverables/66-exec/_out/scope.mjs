import { readFileSync } from 'node:fs';
// 确认并发 Agent 对 prompt-copy.js 的改动落在 buildPrompt 之外（否则我的 before/after 长度对比会被污染）
const cur=readFileSync('D:/Web/style/prototypes/_selection/prompt-copy.js','utf8').split('\n');
const base=readFileSync('D:/Web/style/deliverables/66-exec/_out/prompt-copy.BASE.js','utf8').split('\n');
const find=(a,n)=>a.findIndex(l=>l.includes(n));
console.log('CUR buildPrompt@'+find(cur,'function buildPrompt')+'  showManual@'+find(cur,'function showManual'));
console.log('BASE buildPrompt@'+find(base,'function buildPrompt')+'  showManual@'+find(base,'function showManual'));
// buildPrompt 内是否出现并发 Agent 的符号
const start=find(cur,'function buildPrompt'), end=find(cur,'function showManual');
const body=cur.slice(start,end).join('\n');
for(const t of ['benchSetSceneIdsParkingQuery','qParked','benchClearSceneIdsKeepQuery']){
  console.log('  '+t+' inside buildPrompt: '+(body.includes(t)?'YES <-- pollution':'no'));
}
