import { readFileSync } from 'node:fs';
const lines = readFileSync('deliverables/65-exec/primary-raw.txt','utf8').split(/\r?\n/).filter(l=>l.startsWith('__P__ '));
console.log('行数', lines.length);
let fallback=0; const fbIds=[];
for (const l of lines){ const o=JSON.parse(l.slice(6)); const fb = o.pal.length>=2 && (!o.raw || o.raw===o.bg || !o.pal.includes(o.raw)); if(fb){fallback++;fbIds.push(o.id+' raw='+o.raw+' bg='+o.bg);} }
console.log('触发兜底（改写了 primary）的案:', fallback, fbIds.join(' | '));
