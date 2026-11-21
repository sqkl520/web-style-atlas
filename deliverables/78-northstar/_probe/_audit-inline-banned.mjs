/* 族 A 的"无引号点名"：不是 X，而是 Y / X 而非 Y / 不用 X —— X 是被禁做法的名字但没有「」 */
import fs from 'fs'; import vm from 'vm';
globalThis.window={}; vm.runInThisContext(fs.readFileSync('prototypes/_selection/data.js','utf8'));
const S=globalThis.window.SCHEMES;
const CLAUSE=/C-\d+(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+|0\d-[a-z-]+\.md|[0-9]{1,2}\s*号|方案\s*[0-9]{1,2}|文件\s*[0-9]{2}/g;

/* 剥掉条款编号与引号内容后，找"不是…/而非…/不用…/不靠…"后面拖的被禁做法名 */
function inlineBanned(a){
  const t=a.replace(CLAUSE,' ').replace(/「[^」]*」/g,' ');
  const out=[];
  const PATS=[
    /不是([^，；。]{4,50}?)(?=，而是|；|。)/g,
    /([^，；。]{4,50}?)\s*而非\s*/g,
    /不(?:用|靠|设|做|要)([^，；。]{4,50}?)(?=[；。，])/g,
    /既没有([^，；。]{4,50}?)(?=[，；。])/g,
    /没有([^，；。]{4,40}?)(?=[；。])/g,
  ];
  for(const re of PATS){ let m; while((m=re.exec(t))){ const x=(m[1]||'').trim(); if(x.length>=4) out.push(m[0].trim()); } }
  return out;
}
let tot=0; const per=[];
for(const x of S){
  const h=inlineBanned(x.audit||'');
  if(h.length){ per.push([x.id,h]); tot+=h.length; }
}
console.log(`无引号点名的被禁做法：${tot} 处，分布在 ${per.length}/35 案\n`);
for(const [id,h] of per){
  console.log(id+'  ('+h.length+' 处)');
  for(const s of h) console.log('    "'+s+'"');
}
