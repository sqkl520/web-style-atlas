/* 端到端：把 5 段改写稿替换进 SCHEMES 的副本，跑闸门的判据，必须 5/5 通过。
 * 这是"闸门不是恒红"的证明 —— 与 --selftest 的变异测试互为反面。 */
import fs from 'fs';
import vm from 'vm';
globalThis.window={};
vm.runInThisContext(fs.readFileSync('prototypes/_selection/data.js','utf8'));
const SCHEMES=globalThis.window.SCHEMES;
const R=JSON.parse(fs.readFileSync('deliverables/78-northstar/_probe/_audit-rewrites/rewrites.json','utf8'));

/* 把判据从闸门文件里抠出来复算 —— 不 import（那个文件是 ESM 且会在 import 时跑主逻辑）。
 * 这里是**独立重写**同一套正则，如果两边算出来不一样，恰恰说明判据有歧义。 */
const L1_RE=/(?:^|[^A-Za-z0-9])(?:C-\d(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+|0\d-[a-z-]+\.md(?:\s*[A-Z]\s*节)?|[0-9]{1,2}\s*号|方案\s*[0-9]{1,2}|文件\s*[0-9]{2})/g;
const L2Q=/「([^」]{3,40})」/g;
const L2P=/（(?=[^）]*?(?:圆角|投影|渐变|球体|图标|居中|交替|毛玻璃|Emoji|白字|强调色|星级|光标|占位块|噪点|霓虹))[^）]{4,50}）/g;
const OKQ=[/^\d{4}\s*年/,/^可通行区域$/,/^\d+\s*\/\s*\d+$/];
const VOCAB=['居中大标题','等宽卡片','等宽三卡','三等宽','三张等宽','图标罗列','图标网格','图标格子','圆角','柔和投影','浮起','渐变','插值','球体','流体金属','毛玻璃','吸顶','玻璃卡片','噪点','白灰交替','交替分区','#FFFFFF','#000000','纯白','纯黑','星级','头像','闪烁光标','完美居中','发光','视差','轮播'];
const MARKS=/跳脱之处|它故意反/g;
function inlineBanned(t){
  const s=t.replace(/「[^」]*」/g,' ').replace(L1_RE,' ');
  const out=[];let m;
  const r1=/不是([^，；。]{4,50}?)(?=，而是|；|。)/g; while((m=r1.exec(s)))out.push(m[1].trim());
  const r2=/([^，；。]{4,40}?)\s*而非\s*([^，；。]{4,40})/g; while((m=r2.exec(s))){out.push(m[1].trim());out.push(m[2].trim());}
  return out.filter(c=>VOCAB.some(b=>c.includes(b)));
}
function judge(t){
  const q=[...t.matchAll(L2Q)].map(m=>m[0]).filter(x=>!OKQ.some(r=>r.test(x.slice(1,-1))));
  const p=[...t.matchAll(L2P)].map(m=>m[0]);
  return {L1:[...t.matchAll(L1_RE)].map(m=>m[0].trim()),L2q:q,L2p:p,L2b:inlineBanned(t),marks:[...t.matchAll(MARKS)].map(m=>m[0])};
}

let ok=0;
for(const [id,o] of Object.entries(R)){
  const r=judge(o.after);
  const bad=r.L1.length||r.L2q.length||r.L2p.length||r.L2b.length||r.marks.length;
  if(!bad)ok++;
  console.log(`${id}: ${bad?'❌':'✅  PASS'}  L1:${r.L1.length} L2q:${r.L2q.length} L2p:${r.L2p.length} L2b:${r.L2b.length} 标记:${r.marks.length}`+(bad?'  ← '+JSON.stringify(r):''));
}
console.log(`\n${ok}/5 段改写稿通过闸门  ${ok===5?'✅ 闸门接受合格改写，不是恒红':'❌ 闸门误杀了改写稿'}`);

/* 对照：同一判据喂原文必须 5/5 红 */
console.log('\n对照：同一判据喂原 audit（必须 5/5 红）');
let red=0;
for(const id of Object.keys(R)){
  const a=SCHEMES.find(s=>s.id===id).audit;
  const r=judge(a);
  const bad=r.L1.length||r.L2q.length||r.L2p.length||r.L2b.length||r.marks.length;
  if(bad)red++;
  console.log(`  ${id}: ${bad?'❌ 红（正确）':'✅ 绿（错误！）'}`);
}
console.log(`\n${red}/5 原文被正确判红  ${red===5?'✅':'❌ 有漏判'}`);
