import { readFileSync } from 'node:fs';
const pj=JSON.parse(readFileSync('prototypes/_selection/prompts.js','utf8').replace(/^[\s\S]*?window\.STYLE_PROMPTS\s*=\s*/,'').replace(/;\s*$/,''));
let same=0; const diff=[];
for (const s of pj.schemes){
  const t=readFileSync('prototypes/_specs/'+s.id+'.md','utf8');
  const m=/^1-附（去掉名字之后的机制）[：:]\s*(.*)$/m.exec(t);
  if(!m) continue;
  if(m[1].trim()===s.dna.mechanism.trim()) same++; else diff.push(s.id);
}
console.log('S01-S10 里 prompts.js 的机制句与 spec 1-附 逐字相同的:', same+'/10', diff.length?('不同: '+diff.join(' ')):'');
// S11-S30 在 spec 里有没有 1-附
let has=0;
for (let i=11;i<=30;i++){ const id='S'+i; const t=readFileSync('prototypes/_specs/'+id+'.md','utf8'); if(/1-附/.test(t)) has++; }
console.log('S11–S30 的 md 里含「1-附」的案数:', has+'/20');
