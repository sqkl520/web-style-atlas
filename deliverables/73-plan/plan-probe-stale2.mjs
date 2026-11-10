/* plan-probe-stale2.mjs — 只读：把「jpg 该不该纳入陈旧判据」这件事量出来。
 *
 * 关键机制（tools/.../inspect.mjs）：
 *   L61  report.at = new Date().toISOString()   ← **跑之前**就写死了
 *   L87…L128  截图逐张写入 .inspect/*.jpg       ← 跑的过程中写
 *   L171 writeFileSync(report.json)             ← 最后写报告
 * 所以对一次**成功的渲染**：
 *   report.json 的 mtime > 所有 jpg 的 mtime > report.at
 * 「jpg 比 at 新」是设计使然，不是陈旧。
 * 真正表示"有人重跑了截图但没重跑闸门"的判据是：
 *   jpg mtime > report.json 的 mtime
 */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const P = join(ROOT, 'prototypes');

const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name).sort();

const rows = [];
for (const dir of cases) {
  const ins = join(P, dir, '.inspect');
  const rep = join(ins, 'report.json');
  if (!existsSync(rep)) { rows.push({ id: dir.slice(0, 3), missing: true }); continue; }
  const repM = statSync(rep).mtimeMs;
  let at = null;
  try { at = new Date(JSON.parse(readFileSync(rep, 'utf8').replace(/^\uFEFF/, '')).at).getTime(); } catch {}
  let newestJpg = 0, name = '';
  for (const f of readdirSync(ins)) {
    if (!/\.jpe?g$/i.test(f)) continue;
    const m = statSync(join(ins, f)).mtimeMs;
    if (m > newestJpg) { newestJpg = m; name = f; }
  }
  rows.push({
    id: dir.slice(0, 3), dir,
    atMinusRepMin: at ? (at - repM) / 60000 : null,   // 应为负（at 早于报告落盘）
    jpgMinusRepMin: newestJpg ? (newestJpg - repM) / 60000 : null,
    jpgMinusAtMin: newestJpg && at ? (newestJpg - at) / 60000 : null,
    name,
  });
}

console.log('═══ P1b · 三个候选判据的差值（分钟）═══\n');
console.log('  案    at−reportM   jpg−reportM   jpg−at     最新 jpg');
for (const r of rows) {
  if (r.missing) { console.log(`  ${r.id}  （缺 report.json）`); continue; }
  const f = (x) => (x === null ? '   —' : x.toFixed(1).padStart(8));
  console.log(`  ${r.id} ${f(r.atMinusRepMin)}   ${f(r.jpgMinusRepMin)}   ${f(r.jpgMinusAtMin)}   ${r.name}`);
}

const ok = rows.filter((r) => !r.missing && r.jpgMinusRepMin !== null);
const cnt = (pred) => ok.filter(pred).length;
console.log('\n  ── 候选判据 A：jpg mtime > report.json mtime（"重跑过截图但没重跑闸门"）──');
for (const th of [0, 1, 5, 60]) console.log(`     阈值 ${String(th).padStart(3)} 分 ⇒ 红 ${cnt((r) => r.jpgMinusRepMin > th)}/${ok.length} 案`);
console.log('\n  ── 候选判据 B：jpg mtime > report.at（"jpg 比报告声称的时刻新"）──');
for (const th of [0, 1, 5, 60]) console.log(`     阈值 ${String(th).padStart(3)} 分 ⇒ 红 ${cnt((r) => r.jpgMinusAtMin > th)}/${ok.length} 案`);
console.log('\n  ── 参考：at 相对 report.json 落盘时刻 ──');
console.log(`     at 早于 report.json 落盘的案：${cnt((r) => r.atMinusRepMin < 0)}/${ok.length}`);
console.log(`     at 晚于 report.json 落盘的案：${cnt((r) => r.atMinusRepMin > 0)}/${ok.length}  ← 反常，值得单独看`);
for (const r of ok) if (r.atMinusRepMin > 0) console.log(`        ${r.id}  at 比 report.json 落盘晚 ${r.atMinusRepMin.toFixed(1)} 分`);
