/* C4 反向断言的变异测试。
 *
 * 背景：C4 修了两轮 bug（① 宽模式漏英文 ② 记录纠错的文字被当成新声称）。
 * 修完之后它现在报「无输入」——必须证明它仍然抓得住**新的**腐化，
 * 否则就成了"为了不误报而改成永远不报"的空闸门。
 *
 * 4 个变异：
 *   M1  往 _CONTRACT.md 塞一句新的「S13 有 17 处 shadow 属真未修」→ 必须红
 *   M2  往 README-EN.md 塞同一句英文 → 必须红
 *   M3  塞一句「S01 有 5 处 shadow 属真未修」（S01 的 shadow 也是 0）→ 必须红
 *   M4（反向）塞一句带「已清账」的 → 必须仍绿
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const CON = `${ROOT}/prototypes/_CONTRACT.md`;
const EN = `${ROOT}/README-EN.md`;

const orig = { con: readFileSync(CON, 'utf8'), en: readFileSync(EN, 'utf8') };
const restore = () => { writeFileSync(CON, orig.con, 'utf8'); writeFileSync(EN, orig.en, 'utf8'); };

const run = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-contract.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') }; }
};

console.log('═══ 基线 ═══');
let r = run();
console.log(`  exit=${r.code}  ${(r.out.match(/合计 FAIL \d+ \/ WARN \d+ \/ INFO \d+/) || [''])[0]}`);
if (r.code !== 0) { console.log('  ⚠ 基线不绿，终止'); process.exit(1); }

const results = [];
const T = (name, mutate, file, expect) => {
  const next = mutate();
  if (!next) { results.push({ name, ok: null, code: -1 }); return; }
  writeFileSync(file, next, 'utf8');
  const res = run();
  const ok = expect === 'red' ? (res.code === 1 && /C4-doc-claims-fail-that-is-gone/.test(res.out)) : res.code === 0;
  results.push({ name, ok, code: res.code, out: res.out });
  restore();
};

/* M1：中文献 塞新声称 */
T('M1 _CONTRACT.md 塞「S13 有 17 处 shadow 属真未修」→ 必须红',
  () => orig.con.includes('## 10 ') ? orig.con.replace('## 10 ', '**现行欠款**：`S13` 的 17 处 `shadow` 属真未修。\n\n## 10 ') : null,
  CON, 'red');

/* M2：英文版塞新声称 */
T('M2 README-EN.md 塞同一句英文 → 必须红',
  () => orig.en.includes('## ') ? orig.en.replace('## ', "**`S13`'s `shadow` (17 occurrences) genuinely unresolved.**\n\n## ") : null,
  EN, 'red');

/* M3：换一个案（S01，其 shadow 也是 0） */
T('M3 塞「S01 有 5 处 shadow 属真未修」→ 必须红',
  () => orig.con.includes('## 10 ') ? orig.con.replace('## 10 ', '**现行欠款**：`S01` 的 5 处 `shadow` 属真未修。\n\n## 10 ') : null,
  CON, 'red');

/* M4（反向）：带撤回标记 → 仍绿 */
T('M4（反向）塞带「已清账」的同一句 → 必须绿',
  () => orig.con.includes('## 10 ') ? orig.con.replace('## 10 ', '`S13` 的 17 处 `shadow` **已清账**，不再是欠款。\n\n## 10 ') : null,
  CON, 'green');

restore();
console.log('');
for (const x of results) {
  console.log(`${x.ok === true ? '✓' : x.ok === false ? '✗' : '?'}  ${x.name}   （exit=${x.code}）`);
  if (x.ok === false && x.out) {
    console.log('      ' + String(x.out).split('\n').filter((l) => /C4|合计/.test(l)).slice(0, 2).join('\n      '));
  }
}
const passed = results.filter((x) => x.ok === true).length;
console.log(`\n═══ C4 变异测试: ${passed}/${results.length} ═══`);

r = run();
console.log(`恢复后: exit=${r.code}  ${(r.out.match(/合计 FAIL \d+ \/ WARN \d+ \/ INFO \d+/) || [''])[0]}`);
