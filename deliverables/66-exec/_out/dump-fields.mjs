import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const SEL='D:/Web/style/prototypes/_selection';
const win={}; win.window=win;
const ctx=vm.createContext({window:win, document:{}, console});
vm.runInContext(readFileSync(SEL+'/data.js','utf8'),ctx,{filename:'data.js'});
const ids=['S01','S02','S06','S12','S19','S24','S28','S29','S05','S07'];
for(const id of ids){
  const sc=win.SCHEMES.find(x=>x.id===id);
  console.log('\n########## '+id+' '+sc.cn);
  for(const f of ['def','visuals','audit','quirk','copy','risk','landing']){
    let t=String(sc[f]||'');
    console.log('-- '+f+' ('+t.length+'): '+t);
  }
}
