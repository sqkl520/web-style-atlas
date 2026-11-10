import { readFileSync } from 'node:fs';
const M = (await import('file:///D:/Web/style/prototypes/_prompts/mechanisms.mjs')).MECHANISMS;
for (let i=1;i<=30;i++){
  const id='S'+String(i).padStart(2,'0');
  const t=readFileSync('prototypes/_specs/'+id+'.md','utf8');
  const m=/^1-附[^\n]*：\s*(.*)$/m.exec(t);
  const line = m?m[1].trim():'(无 1-附 行)';
  const same = M[id] ? (M[id].text.trim()===line?'相同':'不同') : '—';
  console.log(`${id} | 1-附 ${m?'有':'无'} | 长度 ${line.length} | mech ${M[id]?'有':'无'} | ${same}`);
  console.log('   规格: '+line.slice(0,100));
  if (M[id]) console.log('   mech: '+M[id].text.slice(0,100));
}
