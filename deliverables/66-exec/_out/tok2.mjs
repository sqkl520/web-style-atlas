import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const SEL='D:/Web/style/prototypes/_selection';
const win={}; win.window=win;
const ctx=vm.createContext({window:win, document:{}, console});
vm.runInContext(readFileSync(SEL+'/data.js','utf8'),ctx,{filename:'data.js'});
const TOKENS=['空抽屉','故意留空','空白卡片','空白行','永久留','字段是空的','字段为空','还没采集到标本','未落位','不占编号'];
const flat=(sc)=>{ const acc=[]; const walk=(o)=>{ for(const k in o){ const v=o[k]; if(typeof v==='string') acc.push([k,v]); else if(v&&typeof v==='object') walk(v); } }; walk(sc); return acc; };
for(const sc of win.SCHEMES){
  const parts=flat(sc); const hits=[];
  for(const t of TOKENS) for(const [k,v] of parts) if(v.includes(t) && !hits.some(h=>h.t===t)) hits.push({t,k});
  if(hits.length) console.log(sc.id.padEnd(4), hits.map(h=>h.t+'@'+h.k).join('  '));
  else console.log(sc.id.padEnd(4), '-');
}
