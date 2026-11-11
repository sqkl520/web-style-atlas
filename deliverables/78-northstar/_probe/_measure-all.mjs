// 35 案跑一遍修复后的度量器，看有没有异常（崩溃/0 轨/离谱数）。
import { execFileSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = decodeURIComponent(new URL('../../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const dirs = readdirSync(join(ROOT,'prototypes')).filter(d=>/^S\d{2}-/.test(d)).sort();
console.log('案    轨道  选择器                        文字量判断');
let zero=0, err=0;
for (const d of dirs) {
  const html = join(ROOT,'prototypes',d,'index.html');
  if (!existsSync(html)) { console.log(d.slice(0,3)+'  （无 index.html）'); continue; }
  try {
    const out = execFileSync(process.execPath, [join(ROOT,'deliverables/74-q7/measure.mjs'), html], {encoding:'utf8', timeout:120000});
    const j = JSON.parse(out);
    const mark = j.gridTracks === 0 ? '○' : ' ';
    if (j.gridTracks === 0) zero++;
    console.log(mark+String(d).slice(0,4).padEnd(5), String(j.gridTracks).padStart(3), '  ', String(j.gridSel||'—').slice(0,28).padEnd(30), j.gridFrom||'');
  } catch (e) { err++; console.log('✗ '+d.slice(0,3)+'  失败: '+String(e.message).slice(0,60)); }
}
console.log('\n0 轨:',zero,'案（需要看是"无分栏"还是"没测到"）  失败:',err);
