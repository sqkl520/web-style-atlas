// RT 探针 1：30 案 mtime 矩阵 —— 实测 P1b 会不会大面积假阳性
// 口径 A：style.css/index.html mtime vs report.json **mtime**   （计划提出的判据）
// 口径 B：style.css/index.html mtime vs report.json.**at**      （契约 §9.6 与 check-stale 用的判据）
// 只读，不写任何东西。
import { statSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const P = new URL('../../prototypes/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const dirs = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name).sort();

const rows = [];
for (const name of dirs) {
  const rep = join(P, name, '.inspect', 'report.json');
  if (!existsSync(rep)) { rows.push({ id: name.slice(0, 3), note: 'NO report' }); continue; }
  const repM = statSync(rep).mtimeMs;
  let at = NaN;
  try { at = new Date(JSON.parse(readFileSync(rep, 'utf8').replace(/^\uFEFF/, '')).at).getTime(); } catch {}
  let newest = 0, which = '';
  for (const f of ['style.css', 'index.html']) {
    const p = join(P, name, f);
    if (existsSync(p)) { const m = statSync(p).mtimeMs; if (m > newest) { newest = m; which = f; } }
  }
  rows.push({
    id: name.slice(0, 3),
    which,
    cssM: new Date(statSync(join(P, name, 'style.css')).mtimeMs).toISOString().slice(0, 16),
    htmlM: new Date(statSync(join(P, name, 'index.html')).mtimeMs).toISOString().slice(0, 16),
    repM: new Date(repM).toISOString().slice(0, 16),
    atS: Number.isFinite(at) ? new Date(at).toISOString().slice(0, 16) : 'INVALID',
    gapA_mtime: +((newest - repM) / 60000).toFixed(1),   // >0 = 触发计划判据
    gapB_at: +((newest - at) / 60000).toFixed(1),       // >1 = check-stale 判据
  });
}

const A = rows.filter((r) => r.gapA_mtime > 0);
const A1 = rows.filter((r) => r.gapA_mtime > 1);
const B = rows.filter((r) => r.gapB_at > 1);
console.log('== 逐案矩阵（分钟）==');
console.log('id  changed  css.css  html      reportM  report.at   gapA(mtime)  gapB(at)');
for (const r of rows) {
  if (!r.which) { console.log(`${r.id}  ${r.note}`); continue; }
  console.log(`${r.id}  ${r.which.padEnd(8)} ${r.cssM}  ${r.htmlM}  ${r.repM}  ${r.atS}  ${String(r.gapA_mtime).padStart(10)}  ${String(r.gapB_at).padStart(8)}`);
}
console.log('\n== 汇总 ==');
console.log(`口径A（mtime vs report mtime，>0 分钟即触发）: ${A.length}/30 触发 → ${A.map((r) => r.id + ':' + r.gapA_mtime).join(' ')}`);
console.log(`口径A'（>1 分钟容差）                        : ${A1.length}/30 触发 → ${A1.map((r) => r.id + ':' + r.gapA_mtime).join(' ')}`);
console.log(`口径B（mtime vs report.at，check-stale 现行）: ${B.length}/30 触发 → ${B.map((r) => r.id + ':' + r.gapB_at).join(' ')}`);
const negA = rows.filter((r) => Number.isFinite(r.gapA_mtime) && r.gapA_mtime <= 0);
console.log(`口径A 下 gap<=0（css 比 report 旧，永远不报警）: ${negA.length}/30`);
const huge = rows.filter((r) => Math.abs(r.gapA_mtime) > 60 * 24 * 5);
console.log(`两口径差异 >5 天的案: ${huge.length}`);
