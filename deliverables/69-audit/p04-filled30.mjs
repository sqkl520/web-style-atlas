// 只读探针：30 案的 empty-screens 填充率标定（用已入库的 report.json，不重渲染）
import { readFileSync, readdirSync } from 'node:fs';
const ROOT = 'D:/Web/style/prototypes';
const dirs = readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();
const rows = [];
for (const d of dirs) {
  let j;
  try { j = JSON.parse(readFileSync(`${ROOT}/${d}/.inspect/report.json`, 'utf8')); } catch { rows.push({ id: d.slice(0, 3), err: 'no report' }); continue; }
  const v = j.viewports.find((x) => x.width === 1440);
  if (!v) { rows.push({ id: d.slice(0, 3), err: 'no 1440' }); continue; }
  const filled = v.filled || [];
  const under = filled.filter((f) => f < 0.2).length;
  const eff = j.findings.find((f) => f.id === 'empty-screens');
  rows.push({ id: d.slice(0, 3), screens: filled.length, filled, min: Math.min(...filled), under, fail: !!eff, at: j.at.slice(0, 10) });
}
rows.sort((a, b) => (a.min ?? 9) - (b.min ?? 9));
console.log('id  screens  min   #<0.2  empty-screens-FAIL   filled per screen');
for (const r of rows) {
  if (r.err) { console.log(`${r.id}  ${r.err}`); continue; }
  console.log(`${r.id}   ${String(r.screens).padStart(2)}     ${String(r.min).padEnd(5)} ${String(r.under).padStart(2)}     ${r.fail ? 'FAIL' : '-'}                 ${JSON.stringify(r.filled)}`);
}
