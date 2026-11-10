/* P1b 的前提核实：给 check-stale 加「report.json 陈旧」守卫，会触发多少案？
 *
 * 如果 30 案里 28 案都触发，那这个守卫上线即全红 —— 不是信号，是噪声。
 * 先量，再决定。
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();

console.log('═══ 逐案：源文件 mtime vs report.json mtime ═══\n');
console.log('案      css 时间          html 时间         report 时间       差(分钟)  状态');
console.log('─'.repeat(104));

let stale = 0;
const rows = [];
for (const dir of cases) {
  const css = join(P, dir, 'style.css');
  const html = join(P, dir, 'index.html');
  const rep = join(P, dir, '.inspect', 'report.json');
  if (!existsSync(rep)) { console.log(`  ${dir.slice(0, 3)}  report.json 缺失`); continue; }

  const mCss = existsSync(css) ? statSync(css).mtimeMs : 0;
  const mHtml = existsSync(html) ? statSync(html).mtimeMs : 0;
  const mRep = statSync(rep).mtimeMs;
  const newestSrc = Math.max(mCss, mHtml);
  const gapMin = Math.round((newestSrc - mRep) / 60000);
  const isStale = gapMin > 1;
  if (isStale) stale++;

  const f = (ms) => (ms ? new Date(ms).toISOString().slice(0, 16).replace('T', ' ') : '   —            ');
  rows.push({ id: dir.slice(0, 3), gapMin, isStale });
  console.log(`${dir.slice(0, 3)}  ${f(mCss)}  ${f(mHtml)}  ${f(mRep)}  ${String(gapMin).padStart(8)}  ${isStale ? '⚠ 陈旧' : '✓'}`);
}

console.log(`\n═══ 结论 ═══`);
console.log(`  会触发陈旧的案: ${stale}/${cases.length}`);
const gaps = rows.filter((r) => r.isStale).map((r) => r.gapMin).sort((a, b) => a - b);
if (gaps.length) {
  console.log(`  陈旧幅度（分钟）: min ${gaps[0]}  中位 ${gaps[Math.floor(gaps.length / 2)]}  max ${gaps[gaps.length - 1]}`);
  console.log(`  > 1 小时: ${gaps.filter((g) => g > 60).length} 案`);
  console.log(`  > 1 天:   ${gaps.filter((g) => g > 1440).length} 案`);
}

/* 反向：report.json 比源文件新（正常态）有多少 */
console.log(`\n  新鲜的案: ${cases.length - stale}/${cases.length}`);
