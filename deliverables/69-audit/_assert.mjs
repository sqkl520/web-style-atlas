import { readFileSync } from 'node:fs';
const R = 'deliverables/69-audit/';
const ok=[],bad=[];
const chk=(name,cond,detail)=>{ (cond?ok:bad).push(name+(detail?(' ['+detail+']'):'')); };

const p1=JSON.parse(readFileSync(R+'data-p1-length.json','utf8'));
chk('390 屏数 13.701', p1.filter(x=>x.vp==='390x844').every(x=>x.screens===13.701));
chk('390 闸门 slack 10.4', p1.find(x=>x.vp==='390x844'&&x.sort==='gate').slack===10.4);
chk('768 屏数 14.914', p1.filter(x=>x.vp==='768x1024').every(x=>x.screens===14.914));
chk('1440 屏数 9.817', p1.filter(x=>x.vp==='1440x900').every(x=>x.screens===9.817));
chk('5 排序 scrollHeight 全同(390)', new Set(p1.filter(x=>x.vp==='390x844').map(x=>x.scrollHeight)).size===1);

const p13=JSON.parse(readFileSync(R+'data-p13-forensic.json','utf8'));
const hit=p13.candidates.filter(c=>c.matches194).map(c=>c.name);
chk('19.4 命中 3 项', hit.length===3, hit.join(' | '));

const p10=JSON.parse(readFileSync(R+'data-p10-tiers.json','utf8'));
const g=(l,s)=>p10.tiers.find(t=>t.label===l).perSort[s];
chk('375x812 方案号 slack -2.8', g('375x812','n').firstSlack===-2.8);
chk('375x812 闸门 slack -21.6', g('375x812','gate').firstSlack===-21.6);
chk('360x640 方案号 slack -174.8', g('360x640','n').firstSlack===-174.8);
chk('375x667 方案号 slack -147.8', g('375x667','n').firstSlack===-147.8);
chk('414 slack +151.7', g('414x896','n').firstSlack===151.7);

const p5=JSON.parse(readFileSync(R+'data-p5-fragility.json','utf8'));
const pert=p5.perturb.find(x=>x.vp==='390x844');
chk('font+1 → 仍 1 张, slack 5.8', pert.afterFont.full===1 && pert.afterFont.worst.slack===5.8);
chk('+1 行 → 0 张', pert.afterLine.full===0);

const p9=JSON.parse(readFileSync(R+'data-p9-budget.json','utf8'));
chk('+10px 仍 1 张', p9.budget.find(b=>b.addedPx===10).gate.full===1);
chk('+11px 崩到 0', p9.budget.find(b=>b.addedPx===11).gate.full===0);

const p12=JSON.parse(readFileSync(R+'data-p12-decomp.json','utf8'));
const d390=p12.find(x=>x.vp==='390x844');
chk('390 卡合计 11101.8', d390.cardSum===11101.8);
chk('390 chrome 400.4', +(d390.mast.h+d390.rail.h+d390.bar.h+(d390.bar.top-(d390.rail.top+d390.rail.h))).toFixed(1)===400.4);

const p14=JSON.parse(readFileSync(R+'data-p14-recommend.json','utf8'));
const A=p14.find(x=>x.label.startsWith('A ')), C=p14.find(x=>x.label.startsWith('C '));
chk('A 首屏 0 张 / 3.48 屏', A.full===0 && A.firstScreen===3.48);
chk('C 首屏 1 张 / 1.51 屏', C.full===1 && C.firstScreen===1.51);
chk('C 屏数 2.352', C.screens===2.352);

const p8=JSON.parse(readFileSync(R+'data-p8-refined.json','utf8'));
chk('fr 22 组 / 14 单例', p8.groups.fr.groups===22 && p8.groups.fr.singletons===14);
chk('fam 30 组 / 30 单例', p8.groups.fam.groups===30 && p8.groups.fam.singletons===30);
chk('无 sticky 元素', p8.sticky.stickyElements.length===0);

const p16=JSON.parse(readFileSync(R+'data-p16-fonts.json','utf8'));
chk('三档 <13px 均为 0', Object.values(p16).every(v=>v.tinyCount===0));
chk('三档 overflowX 均为 0', Object.values(p16).every(v=>v.overflowX===0));

console.log('通过 '+ok.length+' 项:');
ok.forEach(x=>console.log('  ✓ '+x));
if(bad.length){ console.log('\n失败 '+bad.length+' 项:'); bad.forEach(x=>console.log('  ✗ '+x)); process.exit(1);} 
console.log('\n全部断言通过。');
