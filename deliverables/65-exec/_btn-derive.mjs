import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const S=load('prototypes/_selection/data.js');
const rgb=h=>{const m=/^#?([0-9a-f]{6})$/i.exec(h||'');if(!m)return null;const n=parseInt(m[1],16);return [(n>>16)&255,(n>>8)&255,n&255];};
const L=h=>{const c=rgb(h);if(!c)return null;const s=c.map(v=>{const x=v/255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);});return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2];};
const ratio=(a,b)=>{const x=L(a),y=L(b);const hi=Math.max(x,y),lo=Math.min(x,y);return (hi+0.05)/(lo+0.05);};
let ok=0, bad=[];
for (const r of S){
  if(!r.buttonText) continue;
  const w=ratio(r.primary,'#FFFFFF'), k=ratio(r.primary,'#111111');
  const pick = w>=k?'#FFFFFF':'#111111';
  if(pick===r.buttonText) ok++; else bad.push(`${r.id} 实=${r.buttonText} 主色=${r.primary} 白=${w.toFixed(2)} 黑=${k.toFixed(2)} 规则判=${pick}`);
}
console.log('按「主色对白/黑谁对比度高选谁」推导，命中:', ok+'/17');
console.log(bad.length?bad.join('\n'):'（全部符合）');
console.log('\n13 个没有 buttonText 的案，如果按同规则会推出什么：');
for (const r of S){ if(r.buttonText) continue; const w=ratio(r.primary,'#FFFFFF'),k=ratio(r.primary,'#111111'); console.log(`  ${r.id} 主色 ${r.primary} 白=${w.toFixed(2)} 黑=${k.toFixed(2)} → ${w>=k?'#FFFFFF':'#111111'}`); }
