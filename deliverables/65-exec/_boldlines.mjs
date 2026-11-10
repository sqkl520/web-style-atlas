import { readFileSync } from 'node:fs';
for (let i=1;i<=30;i++){
  const id='S'+String(i).padStart(2,'0');
  const t=readFileSync('prototypes/_specs/'+id+'.md','utf8').split(/\r?\n/);
  t.forEach((l,n)=>{ if(/^\*\*[^*]+\*\*\s*$/.test(l) && !/^\*\*\d{1,2}/.test(l)) console.log(id+':'+(n+1)+': '+l.slice(0,70)); });
}
