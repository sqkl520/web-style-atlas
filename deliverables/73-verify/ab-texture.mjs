/* check-texture.mjs 第三版变异测试。
 *
 * 前两版的教训：
 *   v1 正则吃掉 `}` → 相邻规则漏检 → S02 真实违规被报成合规
 *   v2 状态机只记顶层块 → @media 里嵌套的 body 规则 decls 为 null → 漏 22 条
 * 两版的 ab-texture 都是 6/6，因为变异全在「文件末尾追加」，恰有未消耗的 `}` 作锚点。
 *
 * v3 的变异测试必须覆盖**同一个文件里的相邻规则**与**@media 内嵌规则**，
 * 这两处正是前两版漏掉的地方。
 *
 * 变异用**插入到文件中间**的方式，不用追加。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const FILES = {
  S01: `${ROOT}/prototypes/S01-red-wedge-broadsheet/style.css`,
  S02: `${ROOT}/prototypes/S02-gilded-symmetry-salon/style.css`,
  S24: `${ROOT}/prototypes/S24-cyanotype-rainforest-path/style.css`,
};
const orig = Object.fromEntries(Object.entries(FILES).map(([k, p]) => [k, readFileSync(p, 'utf8')]));

const run = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-texture.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') }; }
};
const restore = () => { for (const [k, p] of Object.entries(FILES)) writeFileSync(p, orig[k], 'utf8'); };

console.log('═══ 基线 ═══');
restore();
let r = run();
console.log(`  exit=${r.code}  ${(r.out.match(/合计 FAIL \d+ \/ WARN \d+/) || [''])[0]}`);
if (r.code !== 0) { console.log('  ⚠ 基线不绿，终止'); process.exit(1); }

const results = [];
const T = (name, key, mutate, expectRed) => {
  restore();
  const next = mutate(orig[key]);
  if (!next || next === orig[key]) { results.push({ name, ok: null, code: -1, hit: '(变异构造失败)' }); return; }
  writeFileSync(FILES[key], next, 'utf8');
  const res = run();
  const ok = expectRed ? (res.code === 1 && /T[12]-body/.test(res.out)) : res.code === 0;
  results.push({ name, ok, code: res.code, hit: (res.out.match(/✗ \[(T\d[^\]]*)\] (\S+)/) || []).slice(1).join(' ') });
  restore();
};

/* ── 关键变异 1：插到文件**中间**（不是末尾）──
 * 前两版只测末尾追加，所以漏检。这次插在「第一条规则之后」。 */
T('M1 在文件中间插入 body{background-image:url(...)} → 必须红', 'S02', (s) => {
  const i = s.indexOf('}', s.indexOf('{'));
  if (i < 0) return null;
  return s.slice(0, i + 1) + '\n\nbody { background-image: url("assets/x.png"); }\n' + s.slice(i + 1);
}, true);

/* ── 关键变异 2：@media 内嵌的 body 规则（v2 漏掉的形态）── */
T('M2 @media 内嵌 body{background-image} → 必须红', 'S24', (s) => {
  const m = s.match(/@media[^{]*\{/);
  if (!m) return null;
  const i = s.indexOf(m[0]) + m[0].length;
  return s.slice(0, i) + '\n  body { background-image: url("assets/y.png"); }\n' + s.slice(i);
}, true);

/* ── 关键变异 3：两个相邻 body 规则，第二个有图（v1 漏掉的形态）── */
T('M3 相邻两个 body 规则、第二个带图 → 必须红', 'S01', (s) => {
  return s + '\nbody { margin: 0; }\nbody { background-image: url("assets/z.png"); }\n';
}, true);

/* ── 变异 4：background 简写 ── */
T('M4 body{background:linear-gradient(...)} → 必须红', 'S01', (s) => {
  const i = s.indexOf('}', s.indexOf('{'));
  return s.slice(0, i + 1) + '\nbody { background: linear-gradient(#fff, #000); }\n' + s.slice(i + 1);
}, true);

/* ── 反向 1：body::before 挂图（契约推荐）── */
T('M5（反向）body::before 挂图 → 必须绿', 'S01', (s) => {
  const i = s.indexOf('}', s.indexOf('{'));
  return s.slice(0, i + 1) + '\nbody::before { content:""; position:fixed; inset:0; background-image: url("assets/g.png"); }\n' + s.slice(i + 1);
}, false);

/* ── 反向 2：body.is-running 挂图（不是裸 body）── */
T('M6（反向）body.is-running 挂图 → 必须绿', 'S01', (s) => {
  const i = s.indexOf('}', s.indexOf('{'));
  return s.slice(0, i + 1) + '\nbody.is-running { background-image: url("assets/h.png"); }\n' + s.slice(i + 1);
}, false);

/* ── 反向 3：纯色 body ── */
T('M7（反向）body 纯色背景 → 必须绿', 'S01', (s) => {
  const i = s.indexOf('}', s.indexOf('{'));
  return s.slice(0, i + 1) + '\nbody { background: #EFE7D7; }\n' + s.slice(i + 1);
}, false);

restore();
console.log('');
for (const x of results) {
  console.log(`${x.ok === true ? '✓' : x.ok === false ? '✗' : '?'}  ${x.name}   （exit=${x.code}${x.hit ? '  ' + x.hit : ''}）`);
}
const passed = results.filter((x) => x.ok === true).length;
console.log(`\n═══ check-texture v3 变异测试: ${passed}/${results.length} ═══`);

r = run();
console.log(`恢复后: exit=${r.code}  ${(r.out.match(/合计 FAIL \d+ \/ WARN \d+/) || [''])[0]}`);
