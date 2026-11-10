/* B2：C5 会不会是**新的恒真式**？或者说它的判据（源码里有没有
 * add('FAIL', '<rule>' 这个字面）是不是太窄，以至于会**假阳性**（冤枉一条能 FAIL 的规则）
 * 或**假阴性**（漏掉一条不能 FAIL 的规则）。
 *
 * 两个实验都在 _CONTRACT.md 上做（不动规则引擎），跑完逐字节恢复：
 *   E1  把 `hairline` 加进允许表。rules.mjs:73 是
 *       `add(s.hairlines >= 2 ? 'FAIL' : 'WARN', 'hairline', …)`
 *       —— 它**能**产生 FAIL（≥2 条时），但 C5 的正则只认 `add('FAIL',` 字面，
 *       必然判它"没有 FAIL 分支"。这是纯假阳性，且不需要改引擎一个字节。
 *   E2  把 `mono` 的调用改成变量规则名（`add('FAIL', MONO_ID, …)`），
 *       行为完全不变，看 C5 是否改口说 mono 不能 FAIL —— 证明 C5 判的是
 *       **源码写法**而不是**行为**，一次无害重构就能让它说谎。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const CON = `${ROOT}/prototypes/_CONTRACT.md`;
const RULES = `${ROOT}/tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs`;
const conOrig = readFileSync(CON, 'utf8');
const rulesOrig = readFileSync(RULES, 'utf8');

const run = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-contract.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') }; }
};
const restore = () => { writeFileSync(CON, conOrig, 'utf8'); writeFileSync(RULES, rulesOrig, 'utf8'); };
const c5line = (out) => (out.split('\n').find((l) => /C5-allow-rule-cannot-fail/.test(l)) || '（无 C5）').trim();

restore();
console.log('═══ 基线 ═══');
let r = run();
console.log(`  C5: ${c5line(r.out)}`);

/* ── E1：允许表加 hairline（它其实能 FAIL） ── */
restore();
console.log('\n═══ E1：把 hairline 加进允许表 ═══');
const conE1 = conOrig.replace('| `measure` |', '| `hairline` | 变异测试加的：它其实能 FAIL | 不管 |\n| `measure` |');
if (conE1 === conOrig) console.log('  ！锚点未找到');
else {
  writeFileSync(CON, conE1, 'utf8');
  const res = run();
  console.log(`  C5: ${c5line(res.out)}`);
  const m = res.out.match(/(\d+)\/(\d+) 条登记规则在规则引擎里\*\*没有 FAIL 分支/);
  const named = /hairline/.test(res.out);
  console.log(`  ⇒ C5 把 hairline 算进"不可能 FAIL"了吗？ ${named ? '是（这就是假阳性）' : '否'}`);
  if (m) console.log(`  ⇒ 允许表规模变成 ${m[2]} 条`);
}

/* ── E2：把 mono 的规则名改成变量（行为不变） ── */
restore();
console.log('\n═══ E2：mono 的规则名改成一个变量（行为完全不变） ═══');
const rulesE2 = rulesOrig.replace(
  "add('FAIL', 'mono',",
  "const MONO_ID = 'mono'; add('FAIL', MONO_ID,",
);
if (rulesE2 === rulesOrig) console.log('  ！锚点未找到');
else {
  writeFileSync(RULES, rulesE2, 'utf8');
  const res = run();
  console.log(`  C5: ${c5line(res.out)}`);
  const m = res.out.match(/(\d+)\/(\d+) 条登记规则在规则引擎里\*\*没有 FAIL 分支/);
  console.log(`  ⇒ C5 现在说 ${m ? m[1] + '/' + m[2] : '?'} 条不能 FAIL（基线是 2/5）`);
  console.log(`  ⇒ mono 被点名了吗？ ${/没有 FAIL 分支[^]*?mono/.test(res.out) ? '是（重构让它冤枉了 mono）' : '否'}`);
  /* 顺带证明确实还能 FAIL：临时把 mono 的 FAIL 真的跑出来不容易，这里只证明
   * 代码路径没变 —— 见源码 diff。 */
  console.log('  ⇒ 行为的唯一变化：规则 id 从字面量换成变量，判定逻辑一字未动');
}

restore();
console.log('\n═══ 恢复后 ═══');
r = run();
console.log(`  C5: ${c5line(r.out)}`);
console.log(`  exit=${r.code}`);
