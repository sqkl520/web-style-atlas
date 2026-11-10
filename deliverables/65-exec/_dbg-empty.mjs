import { readFileSync } from 'node:fs';
const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
for (const id of ['S03','S08','S12']) {
  const text=readFileSync('prototypes/_specs/'+id+'.md','utf8');
  const starts=[];
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*'+NAME+'：','gm'))) starts.push({i:m.index,key:m[3],raw:m[0]});
  starts.sort((a,b)=>a.i-b.i);
  console.log('===== '+id);
  for (const s of starts) if(!s.key.replace(/（[^）]*）/g,'').trim()) console.log('EMPTY KEY raw='+JSON.stringify(s.raw));
}
