globalThis.window = {};
import fs from 'fs';
import vm from 'vm';
vm.runInThisContext(fs.readFileSync('prototypes/_selection/data.js','utf8'));
const S = globalThis.window.SCHEMES;
const TOKENS = ["故意留空", "空抽屉", "空白卡", "空白行", "永久留"];
console.log('void token 来源（字段级）：');
for (const x of S) {
  const hits = [];
  for (const t of TOKENS) {
    const fields = [];
    for (const k of Object.keys(x)) {
      const v = x[k];
      if (typeof v === 'string' && v.includes(t)) fields.push(k);
      else if (v && typeof v === 'object') for (const k2 in v) if (typeof v[k2]==='string' && v[k2].includes(t)) fields.push(k+'.'+k2);
    }
    if (fields.length) hits.push(t+'@'+fields.join(','));
  }
  if (hits.length) console.log('  '+x.id+'  '+hits.join('  '));
}
console.log('\n--- audit 是唯一来源的 token ---');
for (const x of S) {
  for (const t of TOKENS) {
    if (!(x.audit||'').includes(t)) continue;
    const others = Object.keys(x).filter(k=>k!=='audit').filter(k=>{
      const v=x[k];
      if (typeof v==='string') return v.includes(t);
      if (v&&typeof v==='object') return Object.values(v).some(y=>typeof y==='string'&&y.includes(t));
      return false;
    });
    if (!others.length) console.log('  '+x.id+'  token="'+t+'"  → 仅 audit 有，改写时必须原样保留！');
  }
}
