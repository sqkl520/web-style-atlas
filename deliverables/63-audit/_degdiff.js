const fs = require('fs');
const txt = fs.readFileSync('D:/Web/style/deliverables/60-minitems-degrade-audit.md', 'utf8');
const lines = txt.split(/\r?\n/);
const data = JSON.parse(fs.readFileSync('D:/Web/style/prototypes/_prompts/minitems-parsed.json', 'utf8').replace(/^\uFEFF/, ''));
const byId = new Map(data.map(x => [x.id, x]));
console.log('=== 60-audit 表格行 vs minitems-parsed.json ===');
for (const L of lines) {
  const m = L.match(/^\|\s*(S\d{2})[^|]*\|\s*(\d+)\s*\|\s*(yes|no|unknown)\s*\|/);
  if (!m) continue;
  const [, id, min, deg] = m;
  const d = byId.get(id);
  const flag = d && d.degrades === deg ? 'same' : 'DIFF';
  console.log([id, 'doc.min=' + min, 'doc.deg=' + deg, '| json.min=' + (d ? d.minItems : '?'), 'json.deg=' + (d ? d.degrades : '?'), flag].join('  '));
}
console.log('\n=== json 里 degrades=yes 的 13 案 ===');
console.log(data.filter(x => x.degrades === 'yes').map(x => x.id).join(' '));
