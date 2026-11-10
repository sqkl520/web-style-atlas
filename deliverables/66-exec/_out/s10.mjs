import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const SEL='D:/Web/style/prototypes/_selection';
const win={}; win.window=win;
const ctx=vm.createContext({window:win, document:{}, console});
vm.runInContext(readFileSync(SEL+'/data.js','utf8'),ctx,{filename:'data.js'});
const sc=win.SCHEMES.find(x=>x.id==='S10');
console.log('AUDIT: '+sc.audit); console.log('\nQUIRK: '+sc.quirk); console.log('\nLAYOUT: '+sc.layout.slice(0,600));
