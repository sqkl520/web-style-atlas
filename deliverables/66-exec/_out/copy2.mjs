import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const SEL='D:/Web/style/prototypes/_selection';
const win={}; win.window=win;
const ctx=vm.createContext({window:win, document:{}, console});
vm.runInContext(readFileSync(SEL+'/data.js','utf8'),ctx,{filename:'data.js'});
for(const id of ['S12','S23','S24','S29','S10','S30','S05','S01','S18','S06','S02','S19']){
  const sc=win.SCHEMES.find(x=>x.id===id);
  console.log('### '+id+' '+sc.cn+'  minItems?');
  console.log('   copy: '+sc.copy);
}
