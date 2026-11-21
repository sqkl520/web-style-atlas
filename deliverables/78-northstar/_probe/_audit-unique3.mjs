import fs from 'fs'; import vm from 'vm';
globalThis.window={}; vm.runInThisContext(fs.readFileSync('prototypes/_selection/data.js','utf8'));
const S=globalThis.window.SCHEMES;
const CLAUSE=/C-\d(?:\.\d+| 第 \d+ 条)?|R-\d+|P\d+|0\d-[a-z-]+\.md|（\d+）|第[一二三四五六七八九十]，?/g;
const VAL=/#[0-9A-Fa-f]{6}\b|\d+(?:\.\d+)?\s*(?:px|mm|%|°|ms|s|级|档)/g;
const BANNED_TARGET=/^(#FFFFFF|#000000|24PX|16|32PX|48PX)$/;  // 被禁做法的靶值，改写后必须消失
let pos=[],neg=[];
for(const x of S){
  let other='';
  for(const k of Object.keys(x)){ if(k==='audit')continue; const v=x[k];
    if(typeof v==='string')other+=v+'\n';
    else if(v&&typeof v==='object')for(const k2 in v)if(typeof v[k2]==='string')other+=v[k2]+'\n';}
  const oU=other.toUpperCase();
  const ov=[...new Set(((x.audit||'').replace(CLAUSE,' ').match(VAL)||[]).map(v=>v.replace(/\s/g,'').toUpperCase()))];
  for(const v of ov) if(!oU.includes(v)) (BANNED_TARGET.test(v)?neg:pos).push(x.id+':'+v);
}
console.log('仅 audit 有 + 是"被禁靶值"（改写后应消失，不算信息损失）：', neg.length);
console.log('  '+neg.join(' '));
console.log('\n仅 audit 有 + 是正面设计值（改写必须原样搬运）：', pos.length);
console.log('  '+pos.join(' '));
