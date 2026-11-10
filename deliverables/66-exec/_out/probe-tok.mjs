import { readFileSync } from 'node:fs';
const d=readFileSync('D:/Web/style/prototypes/_selection/data.js','utf8');
for(const t of ['不占编号位','保持空着','未落位','跳号','缺号','空着','刻意留','故意留','永久留']){
  const i=d.indexOf(t);
  if(i<0){ console.log('MISS '+t); continue; }
  // find nearest preceding "id": "Sxx"
  const pre=d.slice(0,i); const m=[...pre.matchAll(/"id": "(S\d\d)"/g)]; const id=m.length?m[m.length-1][1]:'?';
  console.log('HIT  '+t+'  -> '+id+'  …'+d.slice(Math.max(0,i-60),i+60).replace(/\s+/g,' ')+'…');
}
