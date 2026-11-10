import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const SEL='D:/Web/style/prototypes/_selection';
const win={}; win.window=win;
const ctx=vm.createContext({window:win, document:{}, console});
vm.runInContext(readFileSync(SEL+'/data.js','utf8'),ctx,{filename:'data.js'});
vm.runInContext(readFileSync(SEL+'/prompts.js','utf8'),ctx,{filename:'prompts.js'});
console.log('SCHEMES keys:'); console.log(Object.keys(win.SCHEMES[0]).join(', '));
for(const k of Object.keys(win.SCHEMES[0])){ const v=win.SCHEMES[0][k]; if(typeof v!=='object') console.log('  '+k+' = '+String(v).slice(0,120)); }
console.log('\nPROMPT scheme keys:'); console.log(Object.keys(win.STYLE_PROMPTS.schemes[0]).join(', '));
console.log('dna keys:'); console.log(Object.keys(win.STYLE_PROMPTS.schemes[0].dna).join(', '));
console.log('capacity:', JSON.stringify(win.STYLE_PROMPTS.schemes[0].capacity));
console.log('\nS02 dna:'); console.log(JSON.stringify(win.STYLE_PROMPTS.schemes[1].dna,null,1).slice(0,1200));
console.log('\nindex.html script order:'); 
