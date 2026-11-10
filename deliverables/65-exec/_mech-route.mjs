import { readFileSync } from 'node:fs';
const dna = JSON.parse(readFileSync('prototypes/_prompts/dna-clean.json','utf8'));
const withMech = dna.filter(d=>d.mechanism && d.mechanism.length);
console.log('dna-clean 有机制句:', withMech.length+'/30', withMech.map(d=>d.id).join(' '));
const src = readFileSync('prototypes/_selection/prompts.js','utf8');
const pj = JSON.parse(src.replace(/^[\s\S]*?window\.STYLE_PROMPTS\s*=\s*/,'').replace(/;\s*$/,''));
const pm = pj.schemes.filter(s=>s.dna.mechanism && s.dna.mechanism.length);
console.log('prompts.js 有机制句:', pm.length+'/30');
console.log(`prompts.js 机制句总字数: ${pm.reduce((a,s)=>a+s.dna.mechanism.length,0)}`);
console.log('样例 S05:', pj.schemes.find(s=>s.id==='S05').dna.mechanism.slice(0,60));
console.log('样例 S25:', pj.schemes.find(s=>s.id==='S25').dna.mechanism.slice(0,60));
for (const f of ['prototypes/_selection/data.js','prototypes/_selection/prompts.js']) {
  const t = readFileSync(f,'utf8');
  console.log(f, '含"1-附"次数', (t.match(/1-附/g)||[]).length, '｜含"机制。"次数', (t.match(/机制/g)||[]).length);
}
