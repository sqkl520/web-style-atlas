import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P='D:/Web/style/prototypes';
const cases=readdirSync(P,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}-/.test(d.name)).map(d=>d.name).sort();
function cssTracks(css){const s=new Set();for(const m of css.matchAll(/repeat\(\s*(\d+)\s*,/g))s.add(+m[1]);for(const m of css.matchAll(/grid-template-columns\s*:\s*([^;}]+)/g)){const frs=(m[1].match(/\d*\.?\d*fr\b/g)||[]).length;if(frs)s.add(frs);}for(const m of css.matchAll(/--(?:cols?|columns|grid-cols?)\s*:\s*(\d+)/gi))s.add(+m[1]);return s;}
function explain(spec,tracks){if(tracks.has(spec))return true;for(const t of tracks)if(t>1&&spec%t===0)return true;return false;}
let sum=0,n=0;
for(const dir of cases){const cssPath=join(P,dir,'style.css');if(!existsSync(cssPath))continue;const tracks=cssTracks(readFileSync(cssPath,'utf8'));
 const pass=[...Array(16)].map((_,i)=>i+1).filter(v=>explain(v,tracks));
 sum+=pass.length;n++;
 console.log(`${dir.slice(0,3)}  tracks=[${[...tracks].sort((a,b)=>a-b)}]  1..16 中被判"explainable"的 ${pass.length}/16 个`);
}
console.log(`\n平均: ${(sum/n).toFixed(1)}/16 个任意整数都能被"解释" → 该判据对随机错误的检出率仅 ${(100-sum/n/16*100).toFixed(0)}%`);
