import fs from 'fs';
const win={};
new Function('window', fs.readFileSync('prototypes/_selection/data.js','utf8'))(win);
const SCHEMES=win.SCHEMES;
const R=JSON.parse(fs.readFileSync('deliverables/78-northstar/_probe/_audit-rewrites/rewrites.json','utf8'));

let b=0,a=0;
for(const o of Object.values(R)){b+=o.before.length;a+=o.after.length;}
const ratio=a/b;
const totalBefore=SCHEMES.reduce((s,x)=>s+(x.audit||'').length,0);
const totalAfter=Math.round(totalBefore*ratio);
console.log(`5 段样本：${b} → ${a} 字，压缩率 ${(ratio*100).toFixed(1)}%`);
console.log(`35 案外推：${totalBefore} → ${totalAfter} 字（减少 ${totalBefore-totalAfter}）`);
const avgPer=Math.round(totalAfter/35);
console.log(`\n提示词现状（README）：2747–3323，中位 3027`);
console.log(`若 audit 全量进提示词：中位 3027 + 约 ${avgPer} = 约 ${3027+avgPer} 字`);
const pct=(3027+avgPer)/3027-1;
console.log(`相对现状 +${(pct*100).toFixed(1)}% → ${pct>0.03?'❌ 超 3% 容差，README 中英两版必须同步改':'✅ 在容差内'}`);
