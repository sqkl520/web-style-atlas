import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P='D:/Web/style/prototypes';
const cases=readdirSync(P,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}-/.test(d.name)).map(d=>d.name).sort();
function specCols(id){const p=join(P,'_specs',id+'.md');if(!existsSync(p))return [];const t=readFileSync(p,'utf8');const i=t.indexOf('布局与网格');if(i<0)return [];const seg=t.slice(i,i+1600);const s=new Set();for(const m of seg.matchAll(/(\d+)\s*栏/g))s.add(+m[1]);return [...s].sort((a,b)=>a-b);}
function cssTracks(css){const s=new Set();for(const m of css.matchAll(/repeat\(\s*(\d+)\s*,/g))s.add(+m[1]);for(const m of css.matchAll(/grid-template-columns\s*:\s*([^;}]+)/g)){const frs=(m[1].match(/\d*\.?\d*fr\b/g)||[]).length;if(frs)s.add(frs);}for(const m of css.matchAll(/--(?:cols?|columns|grid-cols?)\s*:\s*(\d+)/gi))s.add(+m[1]);return s;}
function explain(spec,tracks){if(tracks.has(spec))return {how:'direct'};for(const t of tracks)if(t>1&&spec%t===0)return {how:'÷'+t,via:t};return null;}
let nFull=0,fragile=0;
for(const dir of cases){const id=dir.slice(0,3);const cols=specCols(id);if(!cols.length)continue;
 const cssPath=join(P,dir,'style.css');if(!existsSync(cssPath))continue;
 const tracks=cssTracks(readFileSync(cssPath,'utf8'));
 const ex=cols.map(c=>[c,explain(c,tracks)]);const missing=ex.filter(([,h])=>!h);
 if(!missing.length){nFull++;
   const direct=ex.filter(([,h])=>h.how==='direct').map(([c])=>c);
   const derived=ex.filter(([,h])=>h.how!=='direct').map(([c,h])=>`${c}(÷${h.via})`);
   const onlyTrivial=ex.every(([,h])=>h.how==='direct'||h.via===2);
   if(onlyTrivial&&direct.length<cols.length)fragile++;
   console.log(`${id}  spec=[${cols}]  direct=[${direct}]  derived=[${derived}]  ${direct.length===0?'★ 无一个直接命中':''}`);
 }}
console.log(`\nFULL=${nFull}  其中"仅靠 ÷2 等泛化规则凑齐"的=${fragile}`);
