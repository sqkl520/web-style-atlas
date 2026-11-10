import { readFileSync } from 'node:fs';
const txt = readFileSync('deliverables/65-exec/primary-raw.txt','utf8').replace(/^\uFEFF/,'');
const lines = txt.split(/\r?\n/).filter(l=>l.includes('{"id"'));
const objs = lines.map(l=>JSON.parse(l.slice(l.indexOf('{"id"'))));
console.log('解析到', objs.length, '案');
let fb=0; const fbIds=[]; let sameRaw=0;
for (const o of objs){
  const fallback = o.pal.length>=2 && (!o.raw || o.raw===o.bg || !o.pal.includes(o.raw));
  if (fallback) { fb++; fbIds.push(`${o.id} raw=${o.raw} bg=${o.bg} → 兜底成 ${o.pal[1]}`); }
  if (o.raw === o.pal[1]) sameRaw++;
}
console.log('触发兜底（primary 被改写）的案:', fb, '→', fbIds.join(' | ')||'无');
console.log('原始解析值 === palette[1] 的案:', sameRaw+'/30');
console.log('原始解析值 === bg（=palette[0]）的案:', objs.filter(o=>o.raw===o.bg).map(o=>o.id).join(' ')||'无');
