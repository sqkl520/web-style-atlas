import { readFileSync } from 'node:fs';
const raw = readFileSync('deliverables/65-exec/primary-raw.txt','utf8').split(/\r?\n/);
console.log('总行数', raw.length);
raw.forEach((l,i)=>{ if(!l.startsWith('__P__ ')) console.log('非P行 '+i+': '+JSON.stringify(l.slice(0,80))); });
const lines = raw.filter(l=>l.includes('{"id"'));
const ids = lines.map(l=>JSON.parse(l.slice(l.indexOf('{"id"'))).id);
console.log('解析到', ids.length, '案');
console.log('缺少:', Array.from({length:30},(_,i)=>'S'+String(i+1).padStart(2,'0')).filter(x=>!ids.includes(x)).join(' ')||'无');
