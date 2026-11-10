import { readFileSync } from 'node:fs';
const text=readFileSync('prototypes/_specs/S12.md','utf8');
const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
for (const m of text.matchAll(new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*'+NAME+'\\*\\*\\s*$','gm'))) {
  if (m[0].includes('布局')) console.log('B raw='+JSON.stringify(m[0]), 'i='+m.index, 'end='+(m.index+m[0].length));
}
for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*'+NAME+'：','gm'))) {
  console.log('A raw='+JSON.stringify(m[0]), 'i='+m.index, 'end='+(m.index+m[0].length));
}
console.log('---区域原文---');
console.log(JSON.stringify(text.slice(1410,1520)));
