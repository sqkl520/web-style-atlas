// P24：报告自检 —— 围栏配平、标题都在围栏外、无占位符残留
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE } from './_lib.mjs';

const p = join(HERE, 'REDTEAM-round6.md');
const ls = readFileSync(p, 'utf8').split(/\r?\n/);
let inF = false;
const inside = [], headings = [];
ls.forEach((l, i) => {
  if (l.startsWith('```')) { inF = !inF; return; }
  if (inF) inside.push((i + 1) + ': ' + l);
  if (!inF && /^#{1,4} /.test(l)) headings.push((i + 1) + ': ' + l);
});
console.log('总行数 = %d；结尾围栏闭合 = %s', ls.length, inF ? 'NO（有未闭合围栏！）' : 'YES');
console.log('围栏内的标题（应为 0）：%d', inside.length);
inside.forEach((x) => console.log('  ' + x));
console.log('\n围栏外标题 %d 个：', headings.length);
headings.forEach((x) => console.log('  ' + x));
console.log('\n首行 = %s', JSON.stringify(ls[0]));

// 占位符残留
const bad = [];
ls.forEach((l, i) => { if (/TODO|TBD|XXX|待补|占位符代码|\bFIXME\b/.test(l)) bad.push((i + 1) + ': ' + l.slice(0, 120)); });
console.log('\n占位符/TODO 残留：%d', bad.length);
bad.forEach((x) => console.log('  ' + x));
