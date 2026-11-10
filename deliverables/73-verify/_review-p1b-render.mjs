import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const dirs = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

const rows = [];
for (const d of dirs) {
  const rep = join(P, d, '.inspect', 'report.json');
  if (!existsSync(rep)) continue;
  const j = JSON.parse(readFileSync(rep, 'utf8').replace(/^\uFEFF/,''));
  const at = new Date(j.at).getTime();
  const st = readdirSync(join(P, d, '.inspect')).length;
  const rm = (await import('node:fs')).statSync(rep).mtimeMs;
  rows.push({ id: d.slice(0, 3), delta: (rm - at) / 60000 });
}
rows.sort((a, b) => a.delta - b.delta);
const d = rows.map((r) => r.delta);
const med = d.length % 2 ? d[(d.length - 1) / 2] : (d[d.length / 2 - 1] + d[d.length / 2]) / 2;
console.log('report.mtime - at  (分钟)  —— 单轮渲染耗时');
console.log('  min  = ' + d[0].toFixed(2));
console.log('  median = ' + med.toFixed(2));
console.log('  max  = ' + d[d.length - 1].toFixed(2) + '  (' + rows[rows.length - 1].id + ')');
console.log('\n  超过 3 分钟阈值的（会被判陈旧）：');
for (const r of rows.filter((x) => x.delta > 3)) console.log('    ' + r.id + '  ' + r.delta.toFixed(1) + ' 分');
console.log('\n  1–3 分钟之间（旧阈值 >1 会报、新阈值 >3 放过）：');
for (const r of rows.filter((x) => x.delta > 1 && x.delta <= 3)) console.log('    ' + r.id + '  ' + r.delta.toFixed(2) + ' 分');
