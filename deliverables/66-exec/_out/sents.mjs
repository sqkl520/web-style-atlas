import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const SEL='D:/Web/style/prototypes/_selection';
const win={}; win.window=win;
const ctx=vm.createContext({window:win, document:{}, console});
vm.runInContext(readFileSync(SEL+'/data.js','utf8'),ctx,{filename:'data.js'});
for(const id of ['S18','S10','S20','S22','S27','S03','S13','S21','S25','S26','S30','S08','S14','S16','S23','S17','S11','S02','S12']){
  const sc=win.SCHEMES.find(x=>x.id===id);
  const all=['def','visuals','audit','landing','quirk','copy','risk'].map(f=>String(sc[f]||'')).join(' || ');
  // print sentences containing 空白/留空/空缺/空/缺号
  const parts=all.split(/[。；;]/).filter(t=>/空白|留空|空缺|缺号|空着|空位|空行|空抽屉|未开/.test(t));
  console.log('### '+id+' '+sc.cn);
  for(const p of parts) console.log('    · '+p.slice(0,160));
}
