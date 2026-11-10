// RT 探针 7：P1b 的语义 —— report.json 是「闸门结果 + 截图」。
// 修 css 后不重渲染，不只是"数字旧"，**截图也旧**。量一下到底有多少截图会旧。
// 同时对比：report.json 的 mtime 与 .inspect/*.jpg 的 mtime 是否同步（同一次渲染产物）。
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

let totalJpg = 0, staleJpg = 0, casesWithStaleShots = 0;
const rows = [];
for (const dir of cases) {
  const id = dir.slice(0, 3);
  const ins = join(P, dir, '.inspect');
  const rep = join(ins, 'report.json');
  if (!existsSync(rep)) { rows.push({ id, note: 'no report' }); continue; }
  let at;
  try { at = new Date(JSON.parse(readFileSync(rep, 'utf8').replace(/^\uFEFF/, '')).at).getTime(); } catch { at = NaN; }
  const repM = statSync(rep).mtimeMs;
  let newest = 0, which = '';
  for (const f of ['style.css', 'index.html']) {
    const p = join(P, dir, f);
    if (existsSync(p)) { const m = statSync(p).mtimeMs; if (m > newest) { newest = m; which = f; } }
  }
  const jpgs = readdirSync(ins).filter((f) => /\.jpe?g$/i.test(f));
  totalJpg += jpgs.length;
  const staleShots = jpgs.filter((f) => statSync(join(ins, f)).mtimeMs < newest);
  staleJpg += staleShots.length;
  if (staleShots.length) casesWithStaleShots++;
  rows.push({
    id, nJpg: jpgs.length, nStale: staleShots.length,
    srcGapMin: Math.round((newest - repM) / 60000),
    atStale: Number.isFinite(at) ? Math.round((newest - at) / 60000) : null,
    repVsShot: jpgs.length ? Math.round((statSync(join(ins, jpgs[0])).mtimeMs - repM) / 1000) : null,
    which,
  });
}

console.log('id   截图数  比源文件旧的截图数   源-报告(mtime,分)  源-报告(at,分)  首图-报告(秒)');
let sumStale = 0;
for (const r of rows) {
  if (r.note) { console.log(`${r.id}  ${r.note}`); continue; }
  console.log(`${r.id}   ${String(r.nJpg).padEnd(6)} ${String(r.nStale).padEnd(20)} ${String(r.srcGapMin).padStart(17)}  ${String(r.atStale).padStart(14)}  ${String(r.repVsShot).padStart(13)}`);
  sumStale += r.nStale;
}
console.log('\n== 汇总 ==');
console.log(`  30 案 .inspect 里共有 ${totalJpg} 张截图`);
console.log(`  其中 mtime 早于（更新的）源文件的: ${staleJpg} 张（${(staleJpg / totalJpg * 100).toFixed(1)}%）`);
console.log(`  含 ≥1 张陈旧截图的案: ${casesWithStaleShots}/30`);
console.log(`  ⇒ 「截图也旧」的爆炸半径是「数字也旧」的 ${(staleJpg / Math.max(1, rows.filter((r) => r.srcGapMin > 1).length * 1)).toFixed(1)} 倍（按受影响产物件数比）`);
console.log(`  ⇒ 报告陈旧案数=${rows.filter((r) => r.srcGapMin > 1).length}，截图陈旧案数=${casesWithStaleShots}`);
