import { readFileSync } from 'node:fs';
const j = JSON.parse(readFileSync('prototypes/_selection/.inspect/report.json', 'utf8').replace(/^\uFEFF/, ''));
console.log('at', j.at);
const c = {};
for (const f of j.findings) c[f.level + ':' + (f.id || f.rule)] = (c[f.level + ':' + (f.id || f.rule)] || 0) + 1;
console.log(c);
console.log(JSON.stringify(j.findings.filter((f) => f.level !== 'PASS'), null, 1));
