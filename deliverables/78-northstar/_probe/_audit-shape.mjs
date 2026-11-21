globalThis.window = {};
import fs from 'fs';
import vm from 'vm';
vm.runInThisContext(fs.readFileSync('prototypes/_selection/data.js','utf8'));
const S = globalThis.window.SCHEMES;

const rows = [];
for (const x of S) {
  const a = x.audit || '';
  const enumStyle = /^①/.test(a) ? '①' : /^第一/.test(a) ? '第一' : /^（1）/.test(a) ? '（1）' : '?';
  const verb = /它故意反的是/.test(a) ? '它故意反的是' : /它故意反/.test(a) ? '它故意反' : /反/.test(a) ? '反' : '?';
  const sep = /——/.test(a) ? '——' : /→/.test(a) ? '→' : /：/.test(a) ? '：' : '?';
  const quoted = /「/.test(a);
  const jump = (a.match(/跳脱之处/g)||[]).length;
  const items = (a.match(/[①②③④⑤⑥⑦⑧⑨]/g)||[]).length || (a.match(/（[1-9]）/g)||[]).length || (a.match(/第[一二三四五六七]，/g)||[]).length;
  const clause = (a.match(/(?:C-\d[\d.]*|P\d+|R-\d+)/g)||[]).length;
  const clauseSpelled = (a.match(/C-\d 第 \d+ 条/g)||[]).length;
  rows.push({id:x.id, enumStyle, verb, sep, quoted, jump, items, clause, clauseSpelled, len:a.length});
}
const pad=(s,n)=>String(s).padEnd(n);
console.log(pad('id',5)+pad('len',5)+pad('enum',7)+pad('verb',12)+pad('sep',5)+pad('quot',6)+pad('jump',6)+pad('items',7)+pad('clause',8));
for(const r of rows) console.log(pad(r.id,5)+pad(r.len,5)+pad(r.enumStyle,7)+pad(r.verb,12)+pad(r.sep,5)+pad(r.quoted,6)+pad(r.jump,6)+pad(r.items,7)+pad(r.clause,8));

const grp = {};
for (const r of rows) { const k = r.enumStyle+'|'+r.verb+'|'+r.sep; grp[k]=(grp[k]||[]); grp[k].push(r.id); }
console.log('\n--- grouped by (enum|verb|sep) ---');
for (const [k,v] of Object.entries(grp)) console.log(k, '  n='+v.length, '  ', v.join(','));
console.log('\n--- totals ---');
console.log('quoted「」:', rows.filter(r=>r.quoted).length, ' jump出现:', rows.filter(r=>r.jump>0).length, ' 无jump:', rows.filter(r=>r.jump===0).map(r=>r.id).join(','));
console.log('总clause编号:', rows.reduce((a,b)=>a+b.clause,0), ' 拼写式"第N条":', rows.reduce((a,b)=>a+b.clauseSpelled,0));
