/* 核实两件事：
 *   A) data.js 里 palette[1] === primary 是否仍然 30/30（app.js:945 的注释声称如此）
 *   B) 那 5 个「3 色」案，UI 标签能否正确标出主色（palette[1] 存在吗）
 */
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../../prototypes/_selection/data.js', import.meta.url), 'utf8');
const m = src.match(/window\.SCHEMES\s*=\s*(\[[\s\S]*\]);?\s*$/) || src.match(/=\s*(\[\s*\{[\s\S]*\}\])\s*;?\s*$/);
const arr = JSON.parse(m[1]);

let ok = 0;
const bad = [];
for (const r of arr) {
  const pal = r.palette || [];
  const p1 = (pal[1] || '').toUpperCase();
  const pri = String(r.primary || '').toUpperCase();
  const eq = p1 === pri;
  if (eq) ok++;
  else bad.push({ id: r.id, p1, pri, len: pal.length });
}
console.log('palette[1] === primary :', ok + '/' + arr.length);
if (bad.length) console.log(bad);

console.log('\n3 色的案（palette[1] 存在吗）:');
for (const r of arr) if ((r.palette || []).length === 3) {
  console.log(' ', r.id, r.palette, 'primary=' + r.primary, 'palette[1]=' + r.palette[1]);
}

console.log('\n色块数分布:', JSON.stringify(arr.reduce((a, r) => { const k = (r.palette || []).length; a[k] = (a[k] || 0) + 1; return a; }, {})));
