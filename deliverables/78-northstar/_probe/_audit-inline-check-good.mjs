/* 内联点名检测器喂 5 段改写稿：应为 0 命中。若命中就是假阳性，闸门不能用它硬判。 */
import fs from 'fs';
const R=JSON.parse(fs.readFileSync('deliverables/78-northstar/_probe/_audit-rewrites/rewrites.json','utf8'));
const BANNED_VOCAB=['居中大标题','等宽卡片','等宽三卡','三等宽','三张等宽','hero','图标罗列','图标网格','图标格子','圆角','柔和投影','浮起','投影','渐变','插值','球体','流体金属','毛玻璃','吸顶','玻璃卡片','噪点','白灰交替','交替分区','#FFFFFF','#000000','纯白','纯黑','emoji','Emoji','星级','头像','闪烁光标','打字机','完美居中','发光','视差','轮播','3D'];
function inline(a){
  const t=a.replace(/「[^」]*」/g,' ');
  const out=[];const PATS=[/不是([^，；。]{4,50}?)(?=，而是|；|。)/g,/([^，；。]{4,50}?)\s*而非\s*/g,/不(?:用|靠|设|做|要)([^，；。]{4,50}?)(?=[；。，])/g,/既没有([^，；。]{4,50}?)(?=[，；。])/g,/没有([^，；。]{4,40}?)(?=[；。])/g];
  for(const re of PATS){let m;while((m=re.exec(t))){const x=(m[1]||m[0]).trim();if(x.length>=4)out.push(x);}}
  return out;
}
let fp=0;
for(const [id,o] of Object.entries(R)){
  const h=inline(o.after);
  const bad=h.filter(c=>BANNED_VOCAB.some(v=>c.includes(v)));
  console.log(`${id}: 内联从句 ${h.length} 处，含靶词 ${bad.length} 处  ${bad.length?'❌ '+bad.join(' | '):'✅'}`);
  if(bad.length)fp++;
}
console.log('\n'+(fp?`❌ ${fp}/5 段被误判 —— 内联检测器不能硬判`:'✅ 5/5 零误判 —— 内联检测器可以当硬判据'));
