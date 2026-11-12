import { readFileSync } from 'node:fs';
const src = readFileSync('prototypes/_selection/prompts.js', 'utf8');
const re = /("id":\s*"S34"[^}]*?"minPics":\s*)0/;
const m = src.match(re);
console.log('match:', m ? 'YES' : 'NO');
if (m) {
  const out = src.replace(re, m[1] + '3');
  console.log('len before/after:', src.length, out.length);
  const i = out.indexOf('"id": "S34"');
  const seg = out.slice(i, i + 200);
  const mp = seg.indexOf('"minPics"');
  console.log('after:', JSON.stringify(seg.slice(mp - 20, mp + 25)));
}
