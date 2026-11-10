import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const D=load('prototypes/_selection/data.js');
const P=JSON.parse(readFileSync('prototypes/_selection/prompts.js','utf8').replace(/^[\s\S]*?window\.STYLE_PROMPTS\s*=\s*/,'').replace(/;\s*$/,''));
const NEG={'S02':'#22D3EE','S12':'#0F172A','S17':'#111111','S28':'#EC4899'};
let subset=0; const extraRows=[];
for (const s of P.schemes){
  const d=D.find(x=>x.id===s.id);
  const ph=[...s.dna.palette.matchAll(/#[0-9A-Fa-f]{6}/g)].map(m=>m[0].toUpperCase());
  const missing = d.palette.filter(h=>!ph.includes(h));
  const extra = ph.filter(h=>!d.palette.includes(h));
  if(!missing.length) subset++;
  if(extra.length) extraRows.push(`${s.id} 提示词多出: ${extra.join(' ')}${NEG[s.id]&&extra.includes(NEG[s.id])?'  ← 含被 data.js 判定为「反例/0 次」的 '+NEG[s.id]:''}`);
  if(missing.length) extraRows.push(`${s.id} ★ data.js 有而提示词没有: ${missing.join(' ')}`);
}
console.log('data.js palette 是提示词 palette 子集的案:', subset+'/30');
console.log('\n' + extraRows.join('\n'));
