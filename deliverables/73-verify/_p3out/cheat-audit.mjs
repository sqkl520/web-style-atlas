import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P='D:/Web/style/prototypes';
const ids=readdirSync(join(P,'_specs')).filter(f=>/^S\d{2}\.md$/.test(f)).sort().map(f=>f.slice(0,3));
function field3(id){const t=readFileSync(join(P,'_specs',id+'.md'),'utf8');const i=t.indexOf('配色系统');if(i<0)return null;const lines=t.slice(i).split(/\r?\n/);const buf=[lines[0]];for(let k=1;k<lines.length;k++){if(/^\*{0,2}4[\.．]?\s/.test(lines[k].trim()))break;buf.push(lines[k]);}return buf.join('\n');}
const NEG=/反的是|反\s*#|不采用|不用|禁止|避免|不是|而不是|旧值|作废|修正前/;
function areaPctOf(c){const n=c.replace(/饱和[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*%/g,'').replace(/明度[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*%/g,'').replace(/色相[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*°/g,'');let m=n.match(/(?:占|=|＝)\s*(\d+(?:\.\d+)?)\s*%/);if(m)return parseFloat(m[1]);const all=[...n.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];if(all.length===1)return parseFloat(all[0][1]);return null;}
let silentChoice=0;
for(const id of ids){const seg=field3(id);
 const seen=new Set(); const counted=[]; const drops=[];
 for(const clause of seg.split(/[；;。\n]/)){const negged=NEG.test(clause);const hex=(clause.match(/#[0-9A-Fa-f]{6}/)||[])[0];if(!hex)continue;const H=hex.toUpperCase();
   const cleaned=clause.replace(/[（(][^）)]*[）)]/g,'');const pct=areaPctOf(cleaned);
   if(negged){ if(pct!==null&&!seen.has(H)) drops.push([H,pct,'NEG']); continue; }
   if(seen.has(H)){ if(pct!==null){const first=counted.find(x=>x.H===H); if(first&&Math.abs(first.pct-pct)>0.51) {silentChoice++;console.log(`  ! ${id} ${H} 首值=${first.pct}% 后现=${pct}% → 探针取首值 (${clause.trim().slice(0,70)})`);} } else drops.push([H,null,'DUP-NOPCT']); continue; }
   if(pct!==null){counted.push({H,pct});seen.add(H);} else drops.push([H,null,'NOPCT']);
 }
 for(const [H,pct,why] of drops){ if(pct!==null){ console.log(`  ⚠ ${id} 丢弃 ${H} ${pct}% (${why})`); } }
}
console.log(`\n"同一 hex 两个不同数值、探针静默取首值"的实例数 = ${silentChoice}`);
