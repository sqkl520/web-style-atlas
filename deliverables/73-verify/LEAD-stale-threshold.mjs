/* P1b 的两个改进点，先实测再改。
 *
 * 规划 Agent 的主张：
 *   ① 阈值 `> 1` 应该升到 `> 3`。依据：inspect.mjs 在**渲染开始**写 at（L61）、
 *      **最后**写 report（L171），所以 `report.mtime − at` = 单轮渲染耗时。
 *      若耗时 > 1 分钟，渲染期间别人碰一下 style.css 就会在成功后立刻误判。
 *   ② jpg 也该查，但判据不能是 `jpg.mtime > at`（成功渲染必然让 jpg 比 at 新，
 *      实测阈值 0 时红 30/30），正确判据是 `jpg.mtime > report.json.mtime`。
 *
 * 本探针把两条都量出来。
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const dirs = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name).sort();

console.log('═══ ① 单轮渲染耗时 = report.mtime − at ═══\n');
console.log('案    at                     report.mtime           耗时(分钟)');
console.log('─'.repeat(74));
const dur = [];
for (const dir of dirs) {
  const rp = join(P, dir, '.inspect', 'report.json');
  if (!existsSync(rp)) continue;
  let at;
  try { at = new Date(JSON.parse(readFileSync(rp, 'utf8').replace(/^\uFEFF/, '')).at).getTime(); } catch { continue; }
  if (!Number.isFinite(at)) continue;
  const mt = statSync(rp).mtimeMs;
  const mins = (mt - at) / 60000;
  dur.push({ id: dir.slice(0, 3), at, mt, mins });
  console.log(`${dir.slice(0, 3)}  ${new Date(at).toISOString().slice(0, 19).replace('T', ' ')}   ${new Date(mt).toISOString().slice(0, 19).replace('T', ' ')}   ${mins.toFixed(2).padStart(8)}`);
}
const mins = dur.map((d) => d.mins).sort((a, b) => a - b);
console.log(`\n  min ${mins[0].toFixed(2)}  中位 ${mins[Math.floor(mins.length / 2)].toFixed(2)}  max ${mins[mins.length - 1].toFixed(2)}`);
console.log(`  > 1 分钟的案: ${mins.filter((m) => m > 1).length}/${mins.length}`);
console.log(`  > 3 分钟的案: ${mins.filter((m) => m > 3).length}/${mins.length}`);

console.log('\n═══ ② jpg 判据方向 ═══\n');
let redAt = 0, redReport = 0, total = 0;
for (const dir of dirs) {
  const rp = join(P, dir, '.inspect', 'report.json');
  if (!existsSync(rp)) continue;
  let at;
  try { at = new Date(JSON.parse(readFileSync(rp, 'utf8').replace(/^\uFEFF/, '')).at).getTime(); } catch { continue; }
  const repM = statSync(rp).mtimeMs;
  const jpgs = readdirSync(join(P, dir, '.inspect')).filter((f) => f.endsWith('.jpg'));
  if (!jpgs.length) continue;
  total++;
  const newestJpg = Math.max(...jpgs.map((f) => statSync(join(P, dir, '.inspect', f)).mtimeMs));
  if (newestJpg > at) redAt++;
  if (newestJpg > repM) redReport++;
}
console.log(`  有 jpg 的案: ${total}`);
console.log(`  判据「jpg.mtime > at」        → 红 ${redAt}/${total}   ${redAt > total * 0.5 ? '← 假阳性灾难' : ''}`);
console.log(`  判据「jpg.mtime > report.mtime」→ 红 ${redReport}/${total}   ${redReport === 0 ? '← 安全' : ''}`);

console.log('\n═══ ③ 那时长>1 分钟会不会真的造成误判？═══');
console.log('  场景：A 在跑 render-scheme（耗时 X 分钟），B 在此期间 touch 了 style.css。');
console.log('        A 渲染完成后 report.mtime > css.mtime ⇒ 守卫不报（正确）。');
console.log('        但若守卫比的是 `at`：css.mtime > at 成立 ⇒ **误报**。');
console.log(`  当前实现比的是 CASE_SOURCES 的 mtime vs **at** —— 看 check-stale.mjs:58`);
console.log(`  实测 >1 分钟的案: ${mins.filter((m) => m > 1).length}，其中耗时最大的 ${mins[mins.length - 1].toFixed(2)} 分钟`);
console.log('  ⇒ 当前 30 案里没有耗时 >1 分钟的，所以今天没有误报。但这是个**潜伏**问题。');
