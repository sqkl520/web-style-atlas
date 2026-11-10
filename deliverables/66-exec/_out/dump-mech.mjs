import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const SEL='D:/Web/style/prototypes/_selection';
const win={}; win.window=win;
const ctx=vm.createContext({window:win, document:{}, console});
vm.runInContext(readFileSync(SEL+'/data.js','utf8'),ctx,{filename:'data.js'});
vm.runInContext(readFileSync(SEL+'/prompts.js','utf8'),ctx,{filename:'prompts.js'});
for(const s of win.STYLE_PROMPTS.schemes){
  const sc = win.SCHEMES.find(x=>x.id===s.id) || {};
  console.log('=== '+s.id+' minItems='+s.minItems+' degrades='+(s.capacity&&s.capacity.degrades));
  console.log('  mechanism: '+(s.dna&&s.dna.mechanism));
  console.log('  quirk: '+(sc.quirk||''));
}
