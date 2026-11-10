import { readFileSync } from 'node:fs';
const lines = readFileSync('deliverables/65-exec/primary-raw.txt','utf8').split(/\r?\n/).filter(l=>l.startsWith('__P__ '));
let same=0; const diff=[];
for (const l of lines) {
  const o = JSON.parse(l.slice(6));
  const fb = o.pal.length>=2 && (!o.raw || o.raw===o.bg || !o.pal.includes(o.raw));
  const final = fb ? o.pal[1] : o.raw;
  if (o.raw === o.pal[1]) same++; else diff.push(`${o.id} raw=${o.raw} bg=${o.bg} pal1=${o.pal[1]} 触发兜底=${fb} 最终=${final}`);
}
console.log('解析出的原始 primary 恰好 === palette[1] 的:', same+'/30');
console.log('不同的:'); console.log(diff.join('\n')||'（无）');
