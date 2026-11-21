/* app.js 的 countPoints 会从正文编号符现算"N 条"。改写必须保住编号体系，
 * 否则详情面板的 summary 会从「（4 条）」变成「（0 条）」。 */
import fs from 'fs';
const R=JSON.parse(fs.readFileSync('deliverables/78-northstar/_probe/_audit-rewrites/rewrites.json','utf8'));

const CIRCLED='①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const CN_NUM={'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10};
function runLength(nums){if(!nums.length)return 0;const set={};let n=1;nums.forEach(v=>set[v]=1);while(set[n])n++;return n-1;}
function countPoints(t){
  if(!t)return 0;const circ=[];
  for(let i=0;i<t.length;i++){const k=CIRCLED.indexOf(t[i]);if(k>=0&&circ.indexOf(k+1)<0)circ.push(k+1);}
  const di=[];let m;const reDi=/第([一二三四五六七八九十])[，,、]/g;
  while((m=reDi.exec(t)))if(di.indexOf(CN_NUM[m[1]])<0)di.push(CN_NUM[m[1]]);
  const num=[];const reNum=/[（(](\d{1,2})[）)]/g;
  while((m=reNum.exec(t))){const n=+m[1];if(num.indexOf(n)<0)num.push(n);}
  return Math.max(runLength(circ),runLength(di),runLength(num));
}
let bad=0;
for(const [id,o] of Object.entries(R)){
  const b=countPoints(o.before), a=countPoints(o.after);
  const ok=b===a;
  if(!ok)bad++;
  console.log(`${id}: 「（${b} 条）」→「（${a} 条）」 ${ok?'✅':'❌ 编号体系被破坏'}`);
}
console.log('\n'+(bad?`❌ ${bad} 段`:'✅ 5/5 编号体系保持，面板 summary 不会退化'));
