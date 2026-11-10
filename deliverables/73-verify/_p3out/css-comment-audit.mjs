import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P='D:/Web/style/prototypes';
const ids=readdirSync(join(P,'_specs')).filter(f=>/^S\d{2}\.md$/.test(f)).sort().map(f=>f.slice(0,3));
// Replicate the CSS-comment check exactly, but ALSO detect the "different hex" blind spot.
function field3(id){const t=readFileSync(join(P,'_specs',id+'.md'),'utf8');const i=t.indexOf('配色系统');if(i<0)return null;const lines=t.slice(i).split(/\r?\n/);const buf=[lines[0]];for(let k=1;k<lines.length;k++){if(/^\*{0,2}4[\.．]?\s/.test(lines[k].trim()))break;buf.push(lines[k]);}return buf.join('\n');}
const NEG=/反的是|反\s*#|不采用|不用|禁止|避免|不是|而不是|旧值|作废|修正前/;
function areaPctOf(c){const n=c.replace(/饱和[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*%/g,'').replace(/明度[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*%/g,'').replace(/色相[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*°/g,'');let m=n.match(/(?:占|=|＝)\s*(\d+(?:\.\d+)?)\s*%/);if(m)return parseFloat(m[1]);const all=[...n.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];if(all.length===1)return parseFloat(all[0][1]);return null;}
function areas(seg){const out=[];const seen=new Set();for(const clause of seg.split(/[；;。\n]/)){if(NEG.test(clause))continue;const hex=(clause.match(/#[0-9A-Fa-f]{6}/)||[])[0];if(!hex)continue;const H=hex.toUpperCase();if(seen.has(H))continue;const cleaned=clause.replace(/[（(][^）)]*[）)]/g,'');const pct=areaPctOf(cleaned);if(pct!==null){out.push({hex:H,pct});seen.add(H);}}return out;}
let matchCss=0,mismatch=0,noCss=0,overlapZero=0;
for(const id of ids){const a=areas(field3(id));
 const dir=readdirSync(P,{withFileTypes:true}).find(d=>d.isDirectory()&&d.name.startsWith(id+'-'))?.name; if(!dir)continue;
 const cp=join(P,dir,'style.css'); if(!existsSync(cp))continue;
 const head=readFileSync(cp,'utf8').slice(0,1600);
 const declared=new Map(); for(const m of head.matchAll(/(#[0-9A-Fa-f]{6})\s*([\d.]+)\s*%/g)) declared.set(m[1].toUpperCase(),parseFloat(m[2]));
 if(!declared.size){noCss++;continue;}
 let same=true; for(const x of a){if(declared.has(x.hex)&&Math.abs(declared.get(x.hex)-x.pct)>0.51)same=false;}
 const overlap=[...declared.keys()].filter(h=>a.some(x=>x.hex===h)).length;
 if(same)matchCss++;else mismatch++;
 console.log(`${id}  specHexes=[${a.map(x=>x.hex)}]  cssHexes=[${[...declared.keys()]}]  交叠=${overlap}  判定=${same?'一致':'不一致'}`);
 if(overlap===0)overlapZero++;
}
console.log(`\n一致 ${matchCss}  不一致 ${mismatch}  无注释 ${noCss}`);
console.log(`其中"CSS 色值与规格零交叠却仍被判一致"的案数 = ${overlapZero}`);
