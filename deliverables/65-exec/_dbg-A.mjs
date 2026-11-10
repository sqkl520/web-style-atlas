import { readFileSync } from 'node:fs';
const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
for (const id of ['S01','S03','S05','S08','S10','S12']) {
  const text=readFileSync('prototypes/_specs/'+id+'.md','utf8');
  console.log('===== '+id);
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*'+NAME+'：','gm'))) {
    console.log('  A raw='+JSON.stringify(m[0].slice(0,60)));
  }
}
