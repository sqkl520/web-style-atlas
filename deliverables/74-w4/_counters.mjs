import {readFileSync} from 'node:fs';
const src='D:/Web/style/prototypes/_selection/prompts.js';
const w={window:{}};new Function('window',readFileSync(src,'utf8'))(w.window);
const P=w.window.STYLE_PROMPTS;
const COUNTER=/(\d+)\s*(栏|列|层|级|枚|块|处|行|格|页|倍|个|组|条)/g;
let total=0; const per=[];
for(const s of P.schemes){
  const m=s.dna.mechanism||'';
  const ms=[...m.matchAll(COUNTER)];
  total+=ms.length;
  per.push(`${s.id}:${ms.length}`);
}
console.log('counter-word numeric claims total:',total);
console.log(per.join(' '));
