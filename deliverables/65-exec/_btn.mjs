import { readFileSync } from 'node:fs';
const load=(p)=>JSON.parse(readFileSync(p,'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/,'').replace(/;\s*$/,''));
const S=load('prototypes/_selection/data.js');
const eq1=S.filter(r=>r.primary===r.palette[1]).map(r=>r.id);
console.log('primary===palette[1]:', eq1.length+'/30');
console.log('不等于 palette[1] 的:', S.filter(r=>r.primary!==r.palette[1]).map(r=>r.id+'('+r.primary+' vs '+r.palette[1]+')').join(' '));
console.log('primary===bg 的:', S.filter(r=>r.primary===r.bg).map(r=>r.id).join(' ')||'无');
console.log('primary 在 palette 里:', S.filter(r=>r.palette.includes(r.primary)).length+'/30');
const btn={};
for (const r of S) if(r.buttonText) btn[r.buttonText]=(btn[r.buttonText]||0)+1;
console.log('\nbuttonText 分布:', JSON.stringify(btn, null, 0));
const withBtn=S.filter(r=>r.buttonText);
console.log('有 buttonText:', withBtn.length+'/30；无:', S.filter(r=>!r.buttonText).map(r=>r.id).join(' '));
// 能否从 palette 推出来
const derivable=withBtn.filter(r=>['#FFFFFF','#111111','#000000'].includes(r.buttonText));
console.log('属于 #FFFFFF/#111111/#000000 这类通用值:', derivable.length+'/'+withBtn.length, derivable.map(r=>r.id+':'+r.buttonText).join(' '));
// buttonText 是否在 palette 里
console.log('buttonText 出现在本 case palette 里的:', withBtn.filter(r=>r.palette.includes(r.buttonText)).map(r=>r.id+r.buttonText).join(' ')||'无');
