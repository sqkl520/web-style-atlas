/* plan-probe-stale3.mjs — 只读：为 P1b 定阈值。
 *
 * 三个候选判据：
 *   A  max(style.css,index.html).mtime > report.at      ← 现有 check-stale.mjs 的判据
 *   B  max(style.css,index.html).mtime > report.json.mtime
 *   C  max(.inspect/*.jpg).mtime   > report.json.mtime
 *
 * 为什么要把 B 也算出来：`inspect.mjs:61` 在**渲染开始**时写 `at`，
 * 整轮跑完（30 案实测 0.4–1.6 分钟）才写 `report.json`。
 * 所以「源文件在渲染期间被改」会落进 A 的窗口里，而不会落进 B。
 */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const P = join(ROOT, 'prototypes');
const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

const rows = [];
for (const dir of cases) {
  const ins = join(P, dir, '.inspect');
  const rep = join(ins, 'report.json');
  if (!existsSync(rep)) { rows.push({ id: dir.slice(0, 3), missing: true }); continue; }
  const repM = statSync(rep).mtimeMs;
  let at = null;
  try { at = new Date(JSON.parse(readFileSync(rep, 'utf8').replace(/^\uFEFF/, '')).at).getTime(); } catch {}
  const m = (f) => (existsSync(join(P, dir, f)) ? statSync(join(P, dir, f)).mtimeMs : 0);
  const src = Math.max(m('style.css'), m('index.html'));
  let jpg = 0;
  for (const f of readdirSync(ins)) if (/\.jpe?g$/i.test(f)) jpg = Math.max(jpg, statSync(join(ins, f)).mtimeMs);
  rows.push({
    id: dir.slice(0, 3), dir,
    A: (src - at) / 60000,
    B: (src - repM) / 60000,
    C: (jpg - repM) / 60000,
    renderMin: (repM - at) / 60000,        // 这一轮渲染花了多久
  });
}

const ok = rows.filter((r) => !r.missing);
console.log('═══ P1b · 三个判据的差值（分钟）与单轮渲染耗时 ═══\n');
console.log('  案      A src−at    B src−reportM   C jpg−reportM   渲染耗时');
for (const r of ok) {
  const f = (x) => String(Math.round(x)).padStart(9);
  console.log(`  ${r.id} ${f(r.A)} ${f(r.B)} ${f(r.C)} ${f(r.renderMin).padStart(12)}`);
}
const n = (pred) => ok.filter(pred).length;
console.log('\n  ── 各判据在不同阈值下会红多少案 ──');
console.log('  阈值    A(src−at)   B(src−reportM)   C(jpg−reportM)');
for (const th of [0, 1, 2, 3, 5, 10, 60]) {
  console.log(`  ${String(th).padStart(4)} ${String(n((r) => r.A > th)).padStart(11)} ${String(n((r) => r.B > th)).padStart(16)} ${String(n((r) => r.C > th)).padStart(16)}`);
}
const renders = ok.map((r) => r.renderMin).sort((a, b) => a - b);
console.log(`\n  ── 单轮渲染耗时（at → report.json 落盘）──`);
console.log(`     中位 ${renders[Math.floor(renders.length / 2)].toFixed(1)} 分，最长 ${renders[renders.length - 1].toFixed(1)} 分`);
console.log(`     ⇒ 阈值若小于「最长渲染耗时」，正常的一次渲染过程中改文件会被误判为陈旧。`);
console.log(`     §9.15 与 check-stale 现有容差是 1 分钟 < ${renders[renders.length - 1].toFixed(1)} 分钟 ⇒ **现有容差偏小**。`);
