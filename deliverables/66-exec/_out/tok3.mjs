import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const SEL='D:/Web/style/prototypes/_selection';
const win={}; win.window=win;
const ctx=vm.createContext({window:win, document:{}, console});
vm.runInContext(readFileSync(SEL+'/data.js','utf8'),ctx,{filename:'data.js'});
const TOKENS=['刻意留空','故意留空','永久留','空抽屉','空白卡','空白行','未采集','空缺位','字段为空','未落位','空着','不占编号','留空的角'];
const flat=(sc)=>{const a=[];const w=(o)=>{for(const k in o){const v=o[k];if(typeof v==='string')a.push([k,v]);else if(v&&typeof v==='object')w(v);}};w(sc);return a;};
for(const t of TOKENS){
  const who=[];
  for(const sc of win.SCHEMES){ if(flat(sc).some(([k,v])=>v.includes(t))) who.push(sc.id); }
  console.log(t.padEnd(6)+' -> '+(who.join(' ')||'(none)'));
}
