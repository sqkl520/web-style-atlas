import { readFileSync } from 'node:fs';
const s = readFileSync('prototypes/_selection/prompts.js', 'utf8');
const ks = [...s.matchAll(/^ "([\w]+)":/gm)].map((m) => m[1]);
console.log('top keys:', ks);
const i = s.indexOf('"schemes"');
console.log('schemes idx', i);
if (i > 0) console.log(s.slice(i, i + 260));
