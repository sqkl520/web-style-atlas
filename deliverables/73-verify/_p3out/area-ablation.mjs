import { readFileSync, copyFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P='D:/Web/style/prototypes';
// reuse exact probe logic inline
const NEG=/反的是|反\s*#|不采用|不用|禁止|避免|不是|而不是|旧值|作废|修正前/;
function field3(t){const i=t.indexOf('配色系统');if(i<0)return null;const lines=t.slice(i).split(/\r?\n/);const buf=[lines[0]];for(let k=1;k<lines.length;k++){if(/^\*{0,2}4[\.．]?\s/.test(lines[k].trim()))break;buf.push(lines[k]);}return buf.join('\n');}
function areaPctOf(c){const n=c.replace(/饱和[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*%/g,'').replace(/明度[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*%/g,'').replace(/色相[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*°/g,'');let m=n.match(/(?:占|=|＝)\s*(\d+(?:\.\d+)?)\s*%/);if(m)return parseFloat(m[1]);const all=[...n.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];if(all.length===1)return parseFloat(all[0][1]);return null;}
function areas(seg,useDedup=true,useNeg=true,useHsl=true){const out=[];const seen=new Set();for(const clause of seg.split(/[；;。\n]/)){if(useNeg&&NEG.test(clause))continue;const hex=(clause.match(/#[0-9A-Fa-f]{6}/)||[])[0];if(!hex)continue;const H=hex.toUpperCase();if(useDedup&&seen.has(H))continue;const cleaned=clause.replace(/[（(][^）)]*[）)]/g,'');const pct=(useHsl?areaPctOf(cleaned):(()=>{const m=cleaned.match(/(?:占|=|＝)\s*(\d+(?:\.\d+)?)\s*%/);if(m)return parseFloat(m[1]);const all=[...cleaned.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];if(all.length===1)return parseFloat(all[0][1]);return null;})());if(pct!==null){out.push({H,pct});seen.add(H);}}return out;}
const ids=readdirSync(join(P,'_specs')).filter(f=>/^S\d{2}\.md$/.test(f)).sort().map(f=>f.slice(0,3));
const tests=[['all fixes on',true,true,true],['no dedup',false,true,true],['no neg',true,false,true],['no hsl strip',true,true,false],['none of the 3 fixes',false,false,false]];
for(const [name,d,n,h] of tests){let ok=0;const bads=[];for(const id of ids){const seg=field3(readFileSync(join(P,'_specs',id+'.md'),'utf8'));const a=areas(seg,d,n,h);const s=a.reduce((x,y)=>x+y.pct,0);const isOk=Math.abs(s-100)<0.51&&a.length>=2;if(isOk)ok++;else bads.push(`${id}=${s.toFixed(1)}(${a.length})`);}console.log(`${name.padEnd(22)} ${ok}/30   ${bads.join(' ')}`);}
