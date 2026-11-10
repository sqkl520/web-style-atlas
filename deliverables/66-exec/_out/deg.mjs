import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const SEL='D:/Web/style/prototypes/_selection';
const win={}; win.window=win;
const ctx=vm.createContext({window:win, document:{}, console});
vm.runInContext(readFileSync(SEL+'/data.js','utf8'),ctx,{filename:'data.js'});
vm.runInContext(readFileSync(SEL+'/prompts.js','utf8'),ctx,{filename:'prompts.js'});
// capacity vs dna.degrades agreement
for(const s of win.STYLE_PROMPTS.schemes){
  const cap=s.capacity&&s.capacity.degrades; const dna=s.dna&&s.dna.degrades?'yes':'no';
  if(cap!==dna) console.log('MISMATCH '+s.id+' capacity='+cap+' dna='+dna);
}
console.log('--- capacity.degrades list ---');
console.log(win.STYLE_PROMPTS.schemes.filter(s=>s.capacity.degrades==='yes').map(s=>s.id).join(' '));
