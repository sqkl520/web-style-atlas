import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const B=load('prototypes/_selection/data.js');
console.log('layout 长度分布：');
for (const r of B) console.log(' ', r.id, String(r.layout.length).padStart(4), r.layout.includes('断点具体行为')?'[含断点子段]':'');
const lens=B.map(r=>r.layout.length).sort((a,b)=>a-b);
console.log('中位数', lens[15], '最小', lens[0], '最大', lens[lens.length-1]);
