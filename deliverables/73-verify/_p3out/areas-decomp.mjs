import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P='D:/Web/style/prototypes';
const ids=readdirSync(join(P,'_specs')).filter(f=>/^S\d{2}\.md$/.test(f)).sort().map(f=>f.slice(0,3));
function field3(id){const t=readFileSync(join(P,'_specs',id+'.md'),'utf8');const i=t.indexOf('配色系统');if(i<0)return null;const lines=t.slice(i).split(/\r?\n/);const buf=[lines[0]];for(let k=1;k<lines.length;k++){if(/^\*{0,2}4[\.．]?\s/.test(lines[k].trim()))break;buf.push(lines[k]);}return buf.join('\n');}
const NEG=/反的是|反\s*#|不采用|不用|禁止|避免|不是|而不是|旧值|作废|修正前/;
function areaPctOf(cleaned){const noHsl=cleaned.replace(/饱和[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*%/g,'').replace(/明度[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*%/g,'').replace(/色相[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*°/g,'');let m=noHsl.match(/(?:占|=|＝)\s*(\d+(?:\.\d+)?)\s*%/);if(m)return parseFloat(m[1]);const all=[...noHsl.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];if(all.length===1)return parseFloat(all[0][1]);return null;}
for(const id of ids){const seg=field3(id);if(!seg){console.log(id+' NO FIELD3');continue;}
  const rows=[];const seen=new Set();const skipped=[];
  for(const clause of seg.split(/[；;。\n]/)){ if(NEG.test(clause)){ if(/#[0-9A-Fa-f]{6}/.test(clause)) skipped.push({why:'NEG',clause:clause.trim().slice(0,90)}); continue;} const hex=(clause.match(/#[0-9A-Fa-f]{6}/)||[])[0]; if(!hex)continue; const H=hex.toUpperCase(); if(seen.has(H)){skipped.push({why:'DUP '+H,clause:clause.trim().slice(0,90)});continue;} const cleaned=clause.replace(/[（(][^）)]*[）)]/g,''); const pct=areaPctOf(cleaned); if(pct!==null){rows.push({H,pct,cl:clause.trim().slice(0,80)});seen.add(H);} else {skipped.push({why:'NOPCT '+H,clause:clause.trim().slice(0,110)});}}
  const hexAll=new Set([...seg.matchAll(/#[0-9A-Fa-f]{6}/g)].map(m=>m[0].toUpperCase()));
  const sum=rows.reduce((a,b)=>a+b.pct,0);
  console.log(`${id} sum=${sum.toFixed(1)} counted=${rows.length} hexesInField3=${hexAll.size}  [${rows.map(r=>r.H+'='+r.pct).join(' ')}]`);
  for(const s of skipped) console.log(`     SKIP(${s.why}) ${s.cl}`);
}
