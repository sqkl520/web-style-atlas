import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const D=load('prototypes/_selection/data.js');
const P=JSON.parse(readFileSync('prototypes/_selection/prompts.js','utf8').replace(/^[\s\S]*?window\.STYLE_PROMPTS\s*=\s*/,'').replace(/;\s*$/,''));
let same=0, hasPrimaryHex=0; const rows=[];
for (const s of P.schemes){
  const d=D.find(x=>x.id===s.id);
  const ph=[...s.dna.palette.matchAll(/#[0-9A-Fa-f]{6}/g)].map(m=>m[0].toUpperCase());
  const dh=d.palette;
  const identical = JSON.stringify(ph)===JSON.stringify(dh);
  if(identical) same++;
  if(ph.includes(d.primary)) hasPrimaryHex++;
  rows.push(`${s.id} data.palette=[${dh.join(' ')}] prompt.palette=[${ph.join(' ')}] ${identical?'同':'异'} 主色${ph.includes(d.primary)?'在':'不在'}提示词调色板`);
}
console.log(rows.join('\n'));
console.log(`\ndata.js 的 palette 与 prompts.js(dna) 的 palette 完全一致: ${same}/30`);
console.log(`data.js 的 primary 出现在提示词调色板里的: ${hasPrimaryHex}/30`);
