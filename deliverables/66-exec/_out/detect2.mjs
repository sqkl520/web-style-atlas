import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const SEL='D:/Web/style/prototypes/_selection';
const win={}; win.window=win;
const ctx=vm.createContext({window:win, document:{}, console});
vm.runInContext(readFileSync(SEL+'/data.js','utf8'),ctx,{filename:'data.js'});
const REs = {
  A: /空抽屉|故意留空|留空|空白卡|空白行|永久留|还没采集/,
};
const FIELDS=['def','structure','tone','family','fonts','layout','visuals','motion','audit','risk','landing','scenes','quirk','copy'];
for(const sc of win.SCHEMES){
  const all=FIELDS.map(f=>String(sc[f]||'')).join(' | ');
  const m=all.match(REs.A);
  console.log(sc.id.padEnd(4), m? [...new Set(m)].join(','):'-');
}
console.log('--- second pass with attribution ---');
for(const sc of win.SCHEMES){
  const hit=[];
  for(const f of FIELDS){ const m=String(sc[f]||'').match(REs.A); if(m) hit.push(f+':'+[...new Set(m)].join(',')); }
  if(hit.length) console.log(sc.id, hit.join('  '));
}
