import {readFileSync} from 'node:fs';
const src='D:/Web/style/prototypes/_selection/prompts.js';
const w={window:{}};new Function('window',readFileSync(src,'utf8'))(w.window);
const P=w.window.STYLE_PROMPTS;
// mechanism numbers that look like stroke/line widths: px values <= 12 and near keywords
const KEY=/(线宽|描边|线|痕|框|条|缝|孔|笔画|钢丝|环线|白带|边|栏线)/;
let bad=[];
for(const s of P.schemes){
  const m=s.dna.mechanism||'';
  const lw=(s.dna.lineWidths||'').match(/[\d.]+/g)||[];
  const lwN=lw.map(Number);
  // split mechanism into clauses by ，、—;
  const clauses=m.split(/[，。；、—]/);
  for(const c of clauses){
    if(!KEY.test(c)) continue;
    for(const t of c.matchAll(/(\d*\.?\d+)px/g)){
      const v=Number(t[1]);
      if(v>12) continue; // big values are geometry not line weight
      if(!lwN.some(x=>Math.abs(x-v)<0.001)){
        bad.push(`${s.id} ${v}px in "${c.trim()}" | lineWidths=${s.dna.lineWidths}`);
      }
    }
  }
}
console.log(bad.length+' potential line-width contradictions:');
console.log(bad.join('\n'));
