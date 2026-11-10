import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const S=load('prototypes/_selection/data.js');
let same=0, diff=0, missing=0;
const rows=[];
for (const r of S){
  const p0=(r.palette||[])[0]||null;
  const eq = r.primary===p0;
  if(!r.primary) missing++;
  else if(eq) same++; else diff++;
  rows.push(`${r.id} primary=${r.primary||'null'} palette0=${p0||'null'} palette=[${(r.palette||[]).join(' ')}] ${eq?'同':'异'}`);
}
console.log(rows.join('\n'));
console.log(`\nprimary===palette[0]: ${same}/30；不等: ${diff}；primary 为空: ${missing}`);
