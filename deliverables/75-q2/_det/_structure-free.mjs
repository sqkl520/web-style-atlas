import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(readFileSync('prototypes/_selection/data.js', 'utf8'), ctx);
const S = ctx.window.SCHEMES;
const used = {};
S.forEach(s => (used[s.structure] = used[s.structure] || []).push(s.id));
console.log('有余量的结构标签（还能加几个）：');
Object.entries(used).filter(([,v])=>v.length<3).forEach(([k,v])=>
  console.log('  '+k.padEnd(15)+v.length+' 次  还能加 '+(3-v.length)+'  现有: '+v.join(',')));
console.log('\n调性：');
const t={}; S.forEach(s=>(t[s.tone]=(t[s.tone]||0)+1));
Object.entries(t).sort((a,b)=>a[1]-b[1]).forEach(([k,v])=>console.log('  '+k.padEnd(20)+v+' 案'+(v<=3?'  ← 压线':'')));
