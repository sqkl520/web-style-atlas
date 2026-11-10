import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const SEL='D:/Web/style/prototypes/_selection';
const win={}; win.window=win;
const ctx=vm.createContext({window:win, document:{}, console});
vm.runInContext(readFileSync(SEL+'/data.js','utf8'),ctx,{filename:'data.js'});
const TOK=['空抽屉','故意留空','空白卡片','空白行','行空白','留成空行','还没采集','未采集','缺期','空位','空缺','留空'];
const collect=(o,acc)=>{ for(const k in o){ const v=o[k]; if(typeof v==='string') acc.push(v); else if(v&&typeof v==='object') collect(v,acc); } return acc; };
for(const sc of win.SCHEMES){
  const all=collect(sc,[]).join('\n');
  const hit=TOK.filter(t=>all.includes(t));
  console.log(sc.id, JSON.stringify(hit));
}
