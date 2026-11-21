/* 正确定位每个"丢失"的值的来源：是来自条款编号内部，还是来自被禁做法的名字？ */
import fs from 'fs';
const R=JSON.parse(fs.readFileSync('deliverables/78-northstar/_probe/_audit-rewrites/rewrites.json','utf8'));
for(const id of ['S21','S26']){
  console.log('=== '+id+' before 里的每个数字及其来源 ===');
  const b=R[id].before;
  const re=/\d+(?:\.\d+)?\s*(?:px|mm|%|°|级|栏|条|枚|张|个|行|格)?/g;
  let m;
  while((m=re.exec(b))){
    const s=Math.max(0,m.index-12), e=Math.min(b.length,m.index+m[0].length+8);
    console.log('  "'+m[0]+'"  ← …'+b.slice(s,e).replace(/\n/g,' ')+'…');
  }
  console.log('');
}
