import { readFileSync } from 'node:fs';
const src = readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8');
const D = JSON.parse(src.replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/65-audit/_raw.json', 'utf8'));
let same = 0, diff = 0, tot = 0;
for (const r of D) {
  const raw = rows.find((x) => x.id === r.id);
  tot += r.audit.length;
  const a = r.audit.replace(/\s/g, ''), b = raw.f8.replace(/\s/g, '');
  if (a === b) same++;
  else {
    diff++;
    if (diff <= 5) console.log(r.id + ' 不同: data.js ' + a.length + ' vs specs ' + b.length +
      '\n   data.js前60: ' + a.slice(0, 60) + '\n   specs前60 : ' + b.slice(0, 60));
  }
}
console.log('\n30 案：data.js.audit 与 _specs 字段8 逐字相同 ' + same + ' 案，不同 ' + diff + ' 案');
console.log('data.js audit 总字数 ' + tot);
console.log('\n=== UI 侧对 audit 的引用次数 ===');
for (const f of ['app.js', 'prompt-copy.js', 'prompts.js', 'wizard.js', 'index.html']) {
  const s = readFileSync('D:/Web/style/prototypes/_selection/' + f, 'utf8');
  const n = (s.match(/audit/g) || []).length;
  console.log('  ' + f + ': ' + n + ' 次');
}
console.log('\n=== collect-schemes.mjs 里 audit 的赋值 ===');
const cs = readFileSync('D:/Web/style/prototypes/_build/collect-schemes.mjs', 'utf8');
cs.split('\n').forEach((ln, i) => { if (/audit/.test(ln)) console.log('  ' + (i + 1) + ': ' + ln.trim().slice(0, 140)); });
