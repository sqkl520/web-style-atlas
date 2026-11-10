import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P='D:/Web/style/prototypes';
const NEG=/反的是|反\s*#|不采用|不用|禁止|避免|不是|而不是|旧值|作废|修正前/;
function areaPctOf(c){const n=c.replace(/饱和[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*%/g,'').replace(/明度[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*%/g,'').replace(/色相[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*°/g,'');let m=n.match(/(?:占|=|＝)\s*(\d+(?:\.\d+)?)\s*%/);if(m)return parseFloat(m[1]);const all=[...n.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];if(all.length===1)return parseFloat(all[0][1]);return null;}
function areas(seg){const out=[];const seen=new Set();for(const clause of seg.split(/[；;。\n]/)){if(NEG.test(clause))continue;const hex=(clause.match(/#[0-9A-Fa-f]{6}/)||[])[0];if(!hex)continue;const H=hex.toUpperCase();if(seen.has(H))continue;const cleaned=clause.replace(/[（(][^）)]*[）)]/g,'');const pct=areaPctOf(cleaned);if(pct!==null){out.push({hex:H,pct});seen.add(H);}}return out;}
function field3(id){const t=readFileSync(join(P,'_specs',id+'.md'),'utf8');const i=t.indexOf('配色系统');if(i<0)return null;const lines=t.slice(i).split(/\r?\n/);const buf=[lines[0]];for(let k=1;k<lines.length;k++){if(/^\*{0,2}4[\.．]?\s/.test(lines[k].trim()))break;buf.push(lines[k]);}return buf.join('\n');}
const sum=(s)=>{const a=areas(s);return {n:a.length,sum:+a.reduce((x,y)=>x+y.pct,0).toFixed(1),a};};
const s02=field3('S02');
console.log('基线 S02                     :', JSON.stringify(sum(s02)));
console.log('变异① 58%→60%（应报 102）    :', JSON.stringify(sum(s02.replace('58%','60%'))));
console.log('变异② 58%→55%（应报 97）     :', JSON.stringify(sum(s02.replace('58%','55%'))));
console.log('变异③ 删掉 4% 那个色（应报 96）:', JSON.stringify(sum(s02.replace('`#3A2E1A` 暗棕＝阴影与压痕，4%','`#3A2E1A` 暗棕＝阴影与压痕'))));
console.log('变异④ 加第 5 色 7%（应报 107） :', JSON.stringify(sum(s02.replace('面积和 100','；`#123456` 新色 7%，面积和 100'))));
console.log('变异⑤ 把 4% 改成 4.4%（应 100.4，落在 ±0.5 容差内 → 漏检）:', JSON.stringify(sum(s02.replace('压痕，4%','压痕，4.4%'))));
