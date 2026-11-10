// RT 探针 9：P1b 的判据对不对 ——「报表有多旧」不等于「报表陈不陈旧」
// 计划书的论据是**日期分布**（10-17 的 4 案、最早 13 天前）。
// 但陈旧度的定义是「源文件是否比产物新」，与产物**绝对年龄**无关：
// 一个 14 天没动过的案，只要它的 css 也是 14 天没动过，它就是**新鲜的**。
// 本探针把两个口径并排放，看计划书那个数字错在哪。
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();
const NOW = Date.now();

const rows = [];
for (const dir of cases) {
  const rp = join(P, dir, '.inspect', 'report.json');
  if (!existsSync(rp)) continue;
  let at = NaN;
  try { at = new Date(JSON.parse(readFileSync(rp, 'utf8').replace(/^\uFEFF/, '')).at).getTime(); } catch { continue; }
  if (!Number.isFinite(at)) continue;
  const repM = statSync(rp).mtimeMs;
  let newest = 0;
  for (const f of ['style.css', 'index.html']) {
    const p = join(P, dir, f);
    if (existsSync(p)) newest = Math.max(newest, statSync(p).mtimeMs);
  }
  rows.push({
    id: dir.slice(0, 3),
    ageDays: +((NOW - at) / 86400000).toFixed(1),          // 绝对年龄
    srcGapMin: Math.round((newest - at) / 60000),          // 真陈旧度（源 vs at）
    mtimeVsAtMin: Math.round((repM - at) / 60000),         // mtime 与 at 的偏离
  });
}

console.log('═══ 口径 A：绝对年龄（计划书用的那个数）═══');
const old = rows.filter((r) => r.ageDays > 7).sort((a, b) => b.ageDays - a.ageDays);
console.log(`  report.at 早于 7 天的案: ${old.length}/30`);
for (const r of old) console.log(`    ${r.id}  ${r.ageDays} 天前   ← 但它的源文件之后改过吗: ${r.srcGapMin > 1 ? '改过（真陈旧）' : '没改过（仍然新鲜）'}`);
console.log('');
console.log('  ⇒ 这 ' + old.length + ' 案里，真正陈旧的是 ' + old.filter((r) => r.srcGapMin > 1).length + ' 案。');
console.log('  ⇒ 计划书那句「最早 13 天前」在**陈旧度**这个问题上是无效证据。');
console.log('');

console.log('═══ 口径 B：真陈旧度（源文件 mtime vs report.at）═══');
const stale = rows.filter((r) => r.srcGapMin > 1);
console.log(`  触发案数: ${stale.length}/30 ${stale.length ? '→ ' + stale.map((r) => r.id + '(' + r.srcGapMin + '分)').join(' ') : ''}`);
const fresh = rows.filter((r) => r.srcGapMin <= 1);
console.log(`  新鲜案数: ${fresh.length}/30（最大负差 ${Math.min(...fresh.map((r) => r.srcGapMin))} 分，即报告最晚于源 ${-Math.min(...fresh.map((r) => r.srcGapMin))} 分写入）`);
console.log('');

console.log('═══ 口径 C：计划书提议的判据（源 mtime vs report.json **mtime**）═══');
const div = rows.filter((r) => Math.abs(r.mtimeVsAtMin) > 60).sort((a, b) => Math.abs(b.mtimeVsAtMin) - Math.abs(a.mtimeVsAtMin));
console.log(`  report.json 的 mtime 与 at 偏离 >1 小时的案: ${div.length}/30`);
for (const r of div) console.log(`    ${r.id}  mtime − at = ${r.mtimeVsAtMin} 分（文件被重写过，但 at 没更新 → mtime 不可当"报告何时生成"）`);
console.log('');
if (div.length) {
  console.log('  ⇒ 用 mtime 当判据，这些案的"报告时间"会被往后推，从而**掩盖真实的源文件更新**。');
  console.log('  ⇒ `at` 才是契约 §9.6 指定的唯一依据：「`report.json` 的 `at` 字段是这份报告还算不算数的唯一依据」。');
}
