/* audit 里的具体值，有多少在本案其它字段里出现过？（决定改写能丢多少） */
import fs from 'fs';
import vm from 'vm';
globalThis.window = {};
vm.runInThisContext(fs.readFileSync('prototypes/_selection/data.js','utf8'));
const S = globalThis.window.SCHEMES;

/* 抽取"具体值"：hex、带单位数字、比例 a:b、纯数字比、带小数 */
const VAL = /#[0-9A-Fa-f]{6}\b|\d+(?:\.\d+)?(?:px|mm|%|°|s|ms|em|fr|级|栏|条|枚|张|个|行|格|档|处|倍)?(?=[^0-9]|$)|\d+\s*[:：]\s*\d+/g;
function vals(t){
  return [...new Set((t.match(VAL)||[]).map(v=>v.replace(/\s/g,'').toUpperCase()))].filter(v=>v.length>=1);
}
const rows=[];
for(const x of S){
  const a=x.audit||'';
  let other='';
  for(const k of Object.keys(x)){
    if(k==='audit') continue;
    const v=x[k];
    if(typeof v==='string') other+=v+'\n';
    else if(v&&typeof v==='object') for(const k2 in v) if(typeof v[k2]==='string') other+=v[k2]+'\n';
  }
  const ov=vals(a);
  const uniq=ov.filter(v=>!other.includes(v));
  rows.push({id:x.id, n:ov.length, uniq:uniq.length, uniqList:uniq});
}
const pad=(s,n)=>String(s).padEnd(n);
console.log(pad('id',5)+pad('值数',6)+pad('仅audit有',10)+'  仅 audit 有的值');
let tot=0, totu=0;
for(const r of rows){ tot+=r.n; totu+=r.uniq; console.log(pad(r.id,5)+pad(r.n,6)+pad(r.uniq,10)+'  '+r.uniqList.join(' ')); }
console.log(`\n合计：audit 里 ${tot} 个具体值，其中 ${totu} 个（${(totu/tot*100).toFixed(0)}%）在其它字段里找不到 —— 改写必须原样搬运`);
console.log('\n=== 核对：这些"仅 audit 有"里有多少是真·新信息（人工看）===');
for(const r of rows) if(r.uniqList.length) console.log(`  ${r.id}: ${r.uniqList.join(' ')}`);
