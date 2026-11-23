import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const ROOT='D:/Web/style';
const BT=join(ROOT,'deliverables/78-northstar/_blindtest');
const PR=join(ROOT,'prototypes');
const { fontChains } = await import('file:///D:/Web/style/deliverables/78-northstar/_blindtest/_css-fonts.mjs');
const GENERIC=new Set(['serif','sans-serif','monospace','system-ui','cursive','fantasy','ui-monospace','ui-serif','ui-sans-serif','ui-rounded','emoji','math','fangsong']);
const isG=f=>GENERIC.has(String(f).toLowerCase());
function trunc(c){const i=c.findIndex(isG);return i<0?c:c.slice(0,i+1);}
const arts=readdirSync(BT,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}(-r\d+)?$/.test(d.name)).map(d=>d.name).sort();
const protos=readdirSync(PR,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}-/.test(d.name)).map(d=>d.name).sort();
const load=(list,isArt)=>list.map(id=>{const p=isArt?join(BT,id,'index.html'):join(PR,id,'style.css');if(!existsSync(p))return null;
  const all=fontChains(readFileSync(p,'utf8')); const cs=all.filter(c=>c.length>0); return{id,cs,raw:all};}).filter(Boolean);
const A=load(arts,true),P=load(protos,false);
const J={
 A:cs=>cs.some(c=>!isG(c[c.length-1])),
 B:cs=>cs.some(c=>c.length===2),
 C:cs=>cs.some(c=>c.length===1),
};
for(const [mode,fn] of Object.entries({raw:c=>c, trunc})){
  const a={},p={};
  for(const [k,f] of Object.entries(J)){
    a[k]=A.filter(r=>f(r.cs.map(fn))).length;
    p[k]=P.filter(r=>f(r.cs.map(fn))).length;
  }
  console.log(mode.padEnd(6),'A',a.A+'/38 vs',p.A+'/35  | B',a.B+'/38 vs',p.B+'/35  | C',a.C+'/38 vs',p.C+'/35');
}
// which files change under truncation
const changed=A.filter(r=>{const t=r.cs.map(trunc); return JSON.stringify(t)!==JSON.stringify(r.cs);});
console.log('\nartifacts whose chains change under truncation:', changed.map(r=>r.id).join(' ')||'(none)');
const changedP=P.filter(r=>{const t=r.cs.map(trunc); return JSON.stringify(t)!==JSON.stringify(r.cs);});
console.log('protos:', changedP.map(r=>r.id.slice(0,3)).join(' ')||'(none)');
for(const r of [...changed,...changedP]) {
  r.cs.forEach((c,i)=>{const t=trunc(c); if(JSON.stringify(t)!==JSON.stringify(c)) console.log(`  ${r.id} ${c.join('|')} -> ${t.join('|')}`);});
}
