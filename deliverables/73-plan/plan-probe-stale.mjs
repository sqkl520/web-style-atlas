/* plan-probe-stale.mjs — 只读探针（P1b 实测）
 * 量三件事：
 *   ① 30 案 + _selection 的 report.json.at vs style.css/index.html mtime 的差值分布
 *   ② 不同阈值（1 / 5 / 10 / 30 / 60 分钟）下会红多少案
 *   ③ 把 .inspect/*.jpg 纳入判据后会红多少案（jpg 是产物，不是源）
 * 只读，不写任何被跟踪文件。
 */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const P = join(ROOT, 'prototypes');

const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();

function atOf(reportPath) {
  try {
    const j = JSON.parse(readFileSync(reportPath, 'utf8').replace(/^\uFEFF/, ''));
    const t = new Date(j.at).getTime();
    return Number.isFinite(t) ? { at: t, iso: j.at } : null;
  } catch { return null; }
}

const rows = [];
for (const dir of cases) {
  const rep = join(P, dir, '.inspect', 'report.json');
  const r = atOf(rep);
  if (!r) { rows.push({ dir, id: dir.slice(0, 3), missing: true }); continue; }
  const stat = (f) => (existsSync(join(P, dir, f)) ? statSync(join(P, dir, f)).mtimeMs : 0);
  const css = stat('style.css');
  const html = stat('index.html');
  const src = Math.max(css, html);
  const srcWhich = css >= html ? 'style.css' : 'index.html';
  // .inspect 下 jpg 的最新 mtime
  let jpg = 0, jpgName = '';
  const ins = join(P, dir, '.inspect');
  if (existsSync(ins)) {
    for (const f of readdirSync(ins)) {
      if (!/\.jpe?g$/i.test(f)) continue;
      const m = statSync(join(ins, f)).mtimeMs;
      if (m > jpg) { jpg = m; jpgName = f; }
    }
  }
  rows.push({
    dir, id: dir.slice(0, 3), at: r.at, iso: r.iso,
    srcGapMin: (src - r.at) / 60000,
    srcWhich,
    jpgGapMin: jpg ? (jpg - r.at) / 60000 : null,
    jpgName,
    atAgeDays: (Date.now() - r.at) / 86400000,
  });
}

console.log('═══ P1b · report.json.at vs 源文件 mtime ═══\n');
console.log('  案    report.at                 源最新     srcGap(分)   jpgGap(分)   报告年龄(天)');
for (const r of rows) {
  if (r.missing) { console.log(`  ${r.id}  （缺 report.json）`); continue; }
  const g = r.srcGapMin;
  const bad = g > 1 ? ' ←红' : '';
  console.log(
    `  ${r.id}  ${String(r.iso).slice(0, 19).padEnd(21)} ${r.srcWhich.padEnd(10)} ` +
    `${String(Math.round(g)).padStart(9)} ${String(r.jpgGapMin === null ? '-' : Math.round(r.jpgGapMin)).padStart(11)} ` +
    `${r.atAgeDays.toFixed(1).padStart(11)}${bad}`
  );
}

const gaps = rows.filter((r) => !r.missing).map((r) => r.srcGapMin);
console.log('\n  ── 分布 ──');
console.log(`  源文件比 report 新的案数（gap>0）：${gaps.filter((g) => g > 0).length}/30`);
for (const th of [1, 2, 5, 10, 30, 60, 180, 1440]) {
  const n = gaps.filter((g) => g > th).length;
  console.log(`    阈值 ${String(th).padStart(4)} 分钟 ⇒ 红 ${n} 案`);
}
console.log('\n  ── 若把 .inspect/*.jpg 纳入判据 ──');
const jg = rows.filter((r) => !r.missing && r.jpgGapMin !== null).map((r) => r.jpgGapMin);
console.log(`  jpg 比 report 新的案数（gap>1）：${jg.filter((g) => g > 1).length}/30`);
console.log(`  jpg 最新 mtime 晚于 report.at 的案：`);
for (const r of rows) {
  if (r.missing || r.jpgGapMin === null) continue;
  if (r.jpgGapMin > 1) console.log(`     ${r.id}  ${r.jpgName}  +${Math.round(r.jpgGapMin)} 分`);
}

console.log('\n  ── 「报告年龄」独立问题：report.at 是几天前的 ──');
const age = rows.filter((r) => !r.missing).map((r) => r.atAgeDays).sort((a, b) => a - b);
console.log(`  中位 ${age[Math.floor(age.length / 2)].toFixed(1)} 天，最老 ${age[age.length - 1].toFixed(1)} 天（${rows.find((r) => r.atAgeDays === age[age.length - 1])?.id}）`);

console.log('\n═══ P1a 交叉核对：30 案 FAIL 集合 ═══\n');
const failRows = [];
for (const dir of cases) {
  const rep = join(P, dir, '.inspect', 'report.json');
  if (!existsSync(rep)) continue;
  const j = JSON.parse(readFileSync(rep, 'utf8'));
  const fails = (j.findings || []).filter((f) => f.level === 'FAIL');
  const warns = (j.findings || []).filter((f) => f.level === 'WARN');
  if (fails.length) failRows.push({ id: dir.slice(0, 3), fails: fails.map((f) => f.id), warns: warns.map((f) => f.id) });
}
console.log(`  有 FAIL 的案：${failRows.length} 个`);
for (const f of failRows) console.log(`     ${f.id}  FAIL=[${f.fails.join(',')}]  WARN=[${f.warns.join(',')}]`);
const allFails = failRows.flatMap((f) => f.fails);
console.log(`  FAIL 总数 ${allFails.length}，去重规则 ${[...new Set(allFails)].join(', ')}`);

console.log('\n═══ P1a 变异点候选：§9.15 表解析的边界 ═══');
const contract = readFileSync(join(P, '_CONTRACT.md'), 'utf8');
const i1 = contract.indexOf('9.15'), i2 = contract.indexOf('9.16');
console.log(`  §9.15 切片 indexOf('9.15')=${i1} → indexOf('9.16')=${i2}（差 ${i2 - i1} 字符）`);
console.log(`  ⚠️ indexOf('9.15') 首次出现位置在正文里（§9 目录/上文引用），不一定就是标题行。`);
const firstAt = contract.slice(0, i1).split('\n').length;
const secondAt = contract.slice(0, i2).split('\n').length;
console.log(`  indexOf('9.15') 落在第 ${firstAt} 行；indexOf('9.16') 落在第 ${secondAt} 行`);
const headingLine = contract.split('\n').findIndex((l) => /^\*\*9\.15/.test(l.trim())) + 1;
console.log(`  真正的 §9.15 标题行（/^\\*\\*9\\.15/）在第 ${headingLine} 行`);
console.log(`  ⇒ 探针用 indexOf('9.15') 切片的起点**早于**标题行 ${headingLine - firstAt} 行（会把表格之前的内容也吃进来）`);
