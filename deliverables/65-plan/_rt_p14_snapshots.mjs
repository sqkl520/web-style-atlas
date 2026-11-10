// 探针 14：三个 data 快照的 audit 体量对照（.length vs UTF-8 bytes），定位 26,096 的来源。
import { readFileSync } from 'node:fs';

function load(p) {
  const t = readFileSync(p, 'utf8');
  return JSON.parse(t.slice(t.indexOf('= ') + 2).replace(/;\s*$/, ''));
}

const files = [
  'deliverables/65-exec/data.before.js',
  'deliverables/65-exec/data.after-layout.js',
  'prototypes/_selection/data.js',
];

console.log('文件'.padEnd(46) + '  有audit  字符   字节    汉字   layout');
for (const p of files) {
  const D = load('D:/Web/style/' + p);
  const a = D.reduce((s, r) => s + (r.audit || '').length, 0);
  const ab = D.reduce((s, r) => s + Buffer.byteLength(r.audit || '', 'utf8'), 0);
  const h = D.reduce((s, r) => s + ((r.audit || '').match(/[\u4e00-\u9fff]/g) || []).length, 0);
  const l = D.reduce((s, r) => s + (r.layout || '').length, 0);
  const n = D.filter((r) => (r.audit || '').length).length;
  console.log(p.padEnd(46) + '  ' + String(n).padStart(6) + '  ' + String(a).padStart(6) + '  ' + String(ab).padStart(6) + '  ' + String(h).padStart(5) + '  ' + l);
}

console.log('');
const D = load('D:/Web/style/prototypes/_selection/data.js');
console.log('26,096 检验（以当前 data.js 为准）：');
const audit = D.reduce((s, r) => s + (r.audit || '').length, 0);
const auditB = D.reduce((s, r) => s + Buffer.byteLength(r.audit || '', 'utf8'), 0);
console.log('  audit .length      = ' + audit + '   （差 ' + (audit - 26096) + '）');
console.log('  audit UTF-8 bytes  = ' + auditB + '   （差 ' + (auditB - 26096) + '）');
console.log('  → 26,096 既不等于字符数也不等于字节数。字符数 10,539，字节数 25,767。');
console.log('  → 26,096 / 10,539 = ' + (26096 / audit).toFixed(3) + '，接近但**不是**任何固定字节比（纯中文 3.0、本库实测 ' + (auditB / audit).toFixed(2) + '）。');
console.log('  → 26,096 是一个**无法用任何单一字段复现**的数。可复现的三个真数：10,539 字 / 25,767 字节 / 6,561 汉字。');
