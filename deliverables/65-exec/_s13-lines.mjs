import { readFileSync } from 'node:fs';
const t=readFileSync('prototypes/_specs/S13.md','utf8').split(/\r?\n/);
t.forEach((l,i)=>{ const n=i+1; if(/^(\*\*)?\d{1,2}[.．]|^1-附|^3-附|^自评|^真实上站文案|^\*\*反套路/.test(l)) console.log(n+': '+l.slice(0,60)); });
