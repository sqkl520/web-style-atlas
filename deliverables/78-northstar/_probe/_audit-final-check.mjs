import fs from 'fs';
const R=JSON.parse(fs.readFileSync('deliverables/78-northstar/_probe/_audit-rewrites/rewrites.json','utf8'));
const NEG=/不使用|不存在|禁止|不要|没有|零|而非|而不是|不靠|不写|不设|不做|不用|不得|不许|无纯|不参与|反\s*C-|反「/g;
for(const [id,o] of Object.entries(R)){
  console.log('###### '+id+' 族'+o.family+' ######');
  console.log('--- 改前 ('+o.before.length+' 字) ---');
  console.log(o.before);
  console.log('--- 改后 ('+o.after.length+' 字) ---');
  console.log(o.after);
  const n=(o.after.match(NEG)||[]);
  console.log('--- 改后负面词扫描: '+(n.length?'仍有 '+n.join(' '):'0 处')+' ---');
  console.log('');
}
