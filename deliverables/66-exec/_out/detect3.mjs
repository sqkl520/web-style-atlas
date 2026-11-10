import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const SEL='D:/Web/style/prototypes/_selection';
const win={}; win.window=win;
const ctx=vm.createContext({window:win, document:{}, console});
vm.runInContext(readFileSync(SEL+'/data.js','utf8'),ctx,{filename:'data.js'});
const FIELDS=['def','structure','tone','family','fonts','layout','visuals','motion','audit','risk','landing','scenes','quirk','copy'];
const RE=/.{0,26}(空抽屉|故意留空|空白卡|永久留|留空的角|空白行|还没采集|留空).{0,26}/g;
for(const sc of win.SCHEMES){
  let out=[];
  for(const f of FIELDS){ const t=String(sc[f]||''); let m; while((m=RE.exec(t))) out.push(f+' :: …'+m[0]+'…'); }
  if(out.length){ console.log('### '+sc.id); out.forEach(x=>console.log('   '+x)); }
}
