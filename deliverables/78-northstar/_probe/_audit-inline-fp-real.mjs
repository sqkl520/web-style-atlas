/* 假阳性压力测试：拿 35 案的 visuals/layout/risk/quirk 当"合格正面文本"，看内联检测器会不会误报。
 * 这些是真实存在于提示词里的正面行文，不是我自己写的。 */
import fs from 'fs'; import vm from 'vm';
globalThis.window={}; vm.runInThisContext(fs.readFileSync('prototypes/_selection/data.js','utf8'));
const S=globalThis.window.SCHEMES;
const BANNED=['居中大标题','等宽卡片','等宽三卡','三等宽','三张等宽','图标罗列','图标网格','图标格子','圆角','柔和投影','浮起','渐变','插值','球体','流体金属','毛玻璃','吸顶','玻璃卡片','噪点','白灰交替','交替分区','#FFFFFF','#000000','纯白','纯黑','星级','头像','闪烁光标','完美居中','发光','视差','轮播'];
function inline(a){
  const t=a.replace(/「[^」]*」/g,' ');
  const out=[];const PATS=[/不是([^，；。]{4,50}?)(?=，而是|；|。)/g,/([^，；。]{4,50}?)\s*而非\s*/g,/不(?:用|靠|设|做|要)([^，；。]{4,50}?)(?=[；。，])/g,/既没有([^，；。]{4,50}?)(?=[，；。])/g,/没有([^，；。]{4,40}?)(?=[；。])/g];
  for(const re of PATS){let m;while((m=re.exec(t))){const x=(m[1]||m[0]).trim();if(x.length>=4)out.push(x);}}
  return out;
}
let tot=0,fp=0; const fpList=[];
for(const x of S){
  for(const k of ['layout','visuals','quirk','risk','def','family']){
    const v=x[k]; if(typeof v!=='string')continue;
    for(const c of inline(v)){
      tot++;
      if(BANNED.some(b=>c.includes(b))){fp++; if(fpList.length<25)fpList.push(x.id+'.'+k+': '+c);}
    }
  }
}
console.log(`合格正面文本字段里：内联从句 ${tot} 处，被判"含靶词" ${fp} 处 = 假阳性率 ${(fp/tot*100).toFixed(0)}%`);
console.log('\n假阳性样本（这些在提示词里是合法的正面说法）：');
for(const s of fpList) console.log('  '+s);
