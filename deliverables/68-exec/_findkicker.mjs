import { readFileSync } from 'node:fs';
const f = 'prototypes/_selection/style.css';
const raw = readFileSync(f, 'utf8');
const L = raw.split(/\r?\n/);
console.log('bytes', Buffer.byteLength(raw), 'lines', L.length, 'CR', (raw.match(/\r/g) || []).length);
L.forEach((l, i) => { if (/kicker/.test(l)) console.log(`${i + 1}: ${l}`); });
console.log('--- 1230..1240 ---');
for (let n = 1230; n <= 1240; n++) console.log(`${n}: ${L[n - 1]}`);
