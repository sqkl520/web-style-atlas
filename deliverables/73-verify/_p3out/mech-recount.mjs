import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const P='D:/Web/style/prototypes';
const files=readdirSync(join(P,'_specs')).filter(f=>/^S\d{2}\.md$/.test(f)).sort();
const PATTERNS=[
 ['栏数',/(\d+)\s*栏/g],['基线',/基线\s*(\d+(?:\.\d+)?)\s*px/g],
 ['线宽等级',/(\d+(?:\.\d+)?)\s*px[^。；]{0,6}与\s*(\d+(?:\.\d+)?)\s*px[^。；]{0,8}两级/g],
 ['面积和',/面积和\s*100/g],['断点',/[<≥]\s*(\d{3,4})\s*px/g],
 ['字号',/(\d+)\s*px\s*\/\s*行高\s*([\d.]+)/g],
 ['情绪',/情绪[：:][^）)]*/g],['为什么不像AI',/为什么不像\s*AI[^。]{0,40}/g]];
const tot={};const byCase={};
for(const f of files){const t=readFileSync(join(P,'_specs',f),'utf8');const id=f.slice(0,3);
 for(const [k,re] of PATTERNS){const n=[...t.matchAll(re)].length;if(n){tot[k]=(tot[k]||0)+n;byCase[k]=byCase[k]||[];byCase[k].push(id+':'+n);}}}
for(const [k] of PATTERNS) console.log(k.padEnd(14)+String(tot[k]||0).padStart(5)+'   '+((byCase[k]||[]).join(' ')));
console.log('mech='+['栏数','基线','线宽等级','面积和','断点','字号'].reduce((a,k)=>a+(tot[k]||0),0));
console.log('aes='+['情绪','为什么不像AI'].reduce((a,k)=>a+(tot[k]||0),0));
