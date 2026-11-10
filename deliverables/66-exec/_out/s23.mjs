import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const SEL='D:/Web/style/prototypes/_selection';
const win={}; win.window=win;
const ctx=vm.createContext({window:win, document:{}, console});
vm.runInContext(readFileSync(SEL+'/data.js','utf8'),ctx,{filename:'data.js'});
for(const id of ['S23','S12']){ const sc=win.SCHEMES.find(x=>x.id===id); console.log('### '+id+' layout: '+sc.layout.slice(0,420)); }
