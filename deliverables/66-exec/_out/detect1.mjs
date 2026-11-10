import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const SEL='D:/Web/style/prototypes/_selection';
const win={}; win.window=win;
const ctx=vm.createContext({window:win, document:{}, console});
vm.runInContext(readFileSync(SEL+'/data.js','utf8'),ctx,{filename:'data.js'});
vm.runInContext(readFileSync(SEL+'/prompts.js','utf8'),ctx,{filename:'prompts.js'});
const RE=/空位|空抽屉|空缺|空白|留空|缺号|缺期|未采集|不占编号|空着|空行|借走|照留|留成空|缺口/g;
const FIELDS=['def','visuals','audit','landing','quirk','copy','risk'];
for(const s of win.STYLE_PROMPTS.schemes){
  const sc=win.SCHEMES.find(x=>x.id===s.id)||{};
  const hits=[];
  for(const f of FIELDS){ const t=String(sc[f]||''); const m=t.match(RE); if(m) hits.push(f+':'+[...new Set(m)].join(',')); }
  const mech=String(s.dna&&s.dna.mechanism||''); const mm=mech.match(RE); if(mm) hits.push('mech:'+[...new Set(mm)].join(','));
  const reuse=String(s.dna&&s.dna.reuse||''); const rm=reuse.match(RE); if(rm) hits.push('reuse:'+[...new Set(rm)].join(','));
  console.log(s.id+'  '+(hits.length?hits.join(' | '):'-'));
}
