import {readFileSync} from 'node:fs';
const src='D:/Web/style/prototypes/_selection/prompts.js';
const w={window:{}};new Function('window',readFileSync(src,'utf8'))(w.window);
const P=w.window.STYLE_PROMPTS;
// mechanism px values <=12 that are used as line/stroke widths and are NOT in dna.lineWidths
const WIDTH_CTX=/(线宽|描边|外线|内线|栏线|线只|单线|痕|翻边|白带|孔|钢丝|环线|笔画|条间|缝)/;
let hits=[];
for(const s of P.schemes){
  const m=s.dna.mechanism||'';
  const set=(s.dna.lineWidths||'').match(/[\d.]+/g)?.map(Number)||[];
  for(const c of m.split(/[，。；、—]/)){
    if(!WIDTH_CTX.test(c)) continue;
    for(const t of c.matchAll(/(\d*\.?\d+)px/g)){
      const v=Number(t[1]);
      if(v>12) continue;
      if(!set.includes(v)) hits.push({id:s.id,v,clause:c.trim(),set:s.dna.lineWidths});
    }
  }
}
console.log('mechanism px not in the prompt\'s own "线宽只用这几级" set:',hits.length);
for(const h of hits) console.log(`  ${h.id}  ${h.v}px  in「${h.clause}」  | 线宽集 = ${h.set}`);
