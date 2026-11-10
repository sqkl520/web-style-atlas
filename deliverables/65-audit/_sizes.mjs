import { readFileSync } from 'node:fs';
const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/65-audit/_raw.json', 'utf8'));
const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
console.log('f8  汉字=' + sum('f8han') + '  非空白字符=' + sum('f8chars') + '  UTF8字节=' + rows.reduce((a, r) => a + Buffer.byteLength(r.f8, 'utf8'), 0));
console.log('f9  汉字=' + sum('f9han'));
console.log('f11 汉字=' + sum('f11han'));
console.log('f10 汉字=' + sum('f10han'));
console.log('\n=== 分档体量（非空白字符 / 汉字）===');
for (const [name, lo, hi] of [['S01-S10', 1, 10], ['S11-S20', 11, 20], ['S21-S30', 21, 30]]) {
  const g = rows.filter((r) => +r.id.slice(1) >= lo && +r.id.slice(1) <= hi);
  console.log(name + ': chars 小计 ' + g.reduce((a, r) => a + r.f8chars, 0) +
    '  单案 ' + Math.min(...g.map((r) => r.f8chars)) + '–' + Math.max(...g.map((r) => r.f8chars)) +
    '  均 ' + Math.round(g.reduce((a, r) => a + r.f8chars, 0) / g.length));
}
