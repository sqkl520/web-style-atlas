import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const S=load('prototypes/_selection/data.js');
console.log('palette[0] === bg:', S.filter(r=>r.palette[0]===r.bg).length+'/30', S.filter(r=>r.palette[0]!==r.bg).map(r=>r.id).join(' ')||'');
console.log('palette.length 分布:', JSON.stringify(S.reduce((a,r)=>{a[r.palette.length]=(a[r.palette.length]||0)+1;return a;},{})));
console.log('palette 去重后数量===长度:', S.filter(r=>new Set(r.palette).size===r.palette.length).length+'/30');
// S17/S22/S27 只有 3 色
console.log('只有 3 色的案:', S.filter(r=>r.palette.length===3).map(r=>r.id).join(' '));
