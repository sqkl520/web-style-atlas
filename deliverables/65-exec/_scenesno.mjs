import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const S=load('prototypes/_selection/data.js');
let tail=0, tailCross=0, empty=0, total=0;
const rows=[];
for (const r of S){
  const sn=r.scenesNo||'', sy=r.scenesYes||'', sc=r.scenes||'';
  total+=sn.length;
  const endsWithNo = sc.endsWith(sn) && sn.length>0;
  if(endsWithNo) tail++;
  const inScenes = sn.length>0 && sc.includes(sn);
  if(sn) { if(!inScenes) tailCross++; } else empty++;
  rows.push(`${r.id} scenes=${sc.length} yes=${sy.length} no=${sn.length} 结尾是no:${endsWithNo?'是':'否'} 包含:${inScenes?'是':'否'}`);
}
console.log(rows.join('\n'));
console.log(`\nscenesNo 非空: ${30-empty}/30；scenes 以 scenesNo 结尾: ${tail}/30；scenes 包含 scenesNo: ${30-empty-tailCross}/30`);
console.log('scenesNo 总字数:', total, '｜scenes 总字数:', S.reduce((a,r)=>a+r.scenes.length,0));
console.log('scenesNo 为空:', empty);
