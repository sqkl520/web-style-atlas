import { readFileSync } from 'node:fs';
const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/65-audit/_raw.json', 'utf8'));
const ids = process.argv.slice(2);
for (const id of ids) {
  const r = rows.find((x) => x.id === id);
  console.log('\n================ ' + id + '  F8 (' + r.f8han + ' 汉字 / ' + r.f8.length + ' 字符) ================');
  console.log(r.f8);
  if (process.env.SHOW9) console.log('\n---- F9 (' + r.f9han + ') ----\n' + r.f9);
  if (process.env.SHOW11) console.log('\n---- F11 (' + r.f11han + ') ----\n' + r.f11);
}
