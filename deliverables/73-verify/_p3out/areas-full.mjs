import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P='D:/Web/style/prototypes';
const ids=readdirSync(join(P,'_specs')).filter(f=>/^S\d{2}\.md$/.test(f)).sort().map(f=>f.slice(0,3));
function field3(id){const t=readFileSync(join(P,'_specs',id+'.md'),'utf8');const i=t.indexOf('配色系统');if(i<0)return null;const lines=t.slice(i).split(/\r?\n/);const buf=[lines[0]];for(let k=1;k<lines.length;k++){if(/^\*{0,2}4[\.．]?\s/.test(lines[k].trim()))break;buf.push(lines[k]);}return buf.join('\n');}
const NEG=/反的是|反\s*#|不采用|不用|禁止|避免|不是|而不是|旧值|作废|修正前/;
function areaPctOf(cleaned){const noHsl=cleaned.replace(/饱和[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*%/g,'').replace(/明度[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*%/g,'').replace(/色相[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*°/g,'');let m=noHsl.match(/(?:占|=|＝)\s*(\d+(?:\.\d+)?)\s*%/);if(m)return parseFloat(m[1]);const all=[...noHsl.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];if(all.length===1)return parseFloat(all[0][1]);return null;}
for(const id of ids){const seg=field3(id);if(!seg)continue;
  const rows=[];const seen=new Set();const skipped=[];
  for(const clause of seg.split(/[；;。\n]/)){ const s=clause.trim(); if(NEG.test(clause)){ if(/#[0-9A-Fa-f]{6}/.test(clause)) skipped.push(['NEG',s]); continue;} const hex=(clause.match(/#[0-9A-Fa-f]{6}/)||[])[0]; if(!hex)continue; const H=hex.toUpperCase(); if(seen.has(H)){skipped.push(['DUP '+H,s]);continue;} const cleaned=clause.replace(/[（(][^）)]*[）)]/g,''); const pct=areaPctOf(cleaned); if(pct!==null){rows.push({H,pct,cl:s});seen.add(H);} else {skipped.push(['NOPCT '+H,s]);}}
  console.log(`\n########## ${id}  sum=${rows.reduce((a,b)=>a+b.pct,0).toFixed(1)}`);
  for(const r of rows) console.log(`  COUNT ${r.H} = ${r.pct}%   <<${r.cl}>>`);
  for(const [w,s] of skipped) if(w.startsWith('NOPCT')||w==='NEG') console.log(`  ${w}  <<${s}>>`);
}
