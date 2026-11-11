// 分批跑度量器，避免一次 35 案超时。用法：node _measure-batch.mjs <起始案号> <结束案号>
import { execFileSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = decodeURIComponent(new URL('../../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const from = +process.argv[2] || 1, to = +process.argv[3] || 35;
const dirs = readdirSync(join(ROOT,'prototypes')).filter(d=>/^S\d{2}-/.test(d)).sort();
const rows = [];
for (const d of dirs) {
  const n = +d.slice(1,3);
  if (n < from || n > to) continue;
  const html = join(ROOT,'prototypes',d,'index.html');
  if (!existsSync(html)) { rows.push([d.slice(0,3),'—','无 html']); continue; }
  try {
    const out = execFileSync(process.execPath, [join(ROOT,'deliverables/74-q7/measure.mjs'), html], {encoding:'utf8', timeout:90000});
    const j = JSON.parse(out);
    rows.push([d.slice(0,3), j.gridTracks, (j.gridSel||'—').slice(0,26), j.gridFrom||'']);
  } catch (e) { rows.push([d.slice(0,3),'✗',String(e.message).slice(0,40)]); }
}
for (const r of rows) console.log(r[0].padEnd(4), String(r[1]).padStart(3), ' ', String(r[2]||'').padEnd(28), r[3]||'');
