/* 锐评 Agent 提出的三个 fail-open / 假绿缺陷，验证修复。
 *
 *   F1 移走 rules.mjs → 旧版 exit 0（fail-open）；修复后必须 exit 1
 *   F2 删掉一行规则名的反引号 → 旧版允许表静默 5→4，C2 仍 4/4 全绿；
 *      修复后 C6 必须报警
 *   F3 C5：font-fallback / measure 没有 FAIL 分支 → 必须报 WARN（证明 C1 的判定面有限）
 */
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const RULES = `${ROOT}/tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs`;
const CON = `${ROOT}/prototypes/_CONTRACT.md`;
const RULES_BAK = `${ROOT}/deliverables/73-verify/_rules.mjs.bak`;

const conOrig = readFileSync(CON, 'utf8');
const rulesOrig = readFileSync(RULES, 'utf8');

const run = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-contract.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') }; }
};

const restoreAll = () => {
  writeFileSync(CON, conOrig, 'utf8');
  if (!existsSync(RULES)) writeFileSync(RULES, rulesOrig, 'utf8');
  else writeFileSync(RULES, rulesOrig, 'utf8');
  if (existsSync(RULES_BAK)) { try { execSync(`del "${RULES_BAK}"`, { shell: 'cmd' }); } catch {} }
};

console.log('═══ 基线 ═══');
restoreAll();
let r = run();
console.log(`  exit=${r.code}  ${(r.out.match(/合计 FAIL \d+ \/ WARN \d+ \/ INFO \d+/) || [''])[0]}`);
if (r.code !== 0) { console.log('  ⚠ 基线不绿，终止'); process.exit(1); }

const results = [];

/* F1：移走 rules.mjs */
renameSync(RULES, RULES_BAK);
r = run();
results.push({
  name: 'F1 移走 rules.mjs → 必须 exit 1（旧版 fail-open 为 0）',
  ok: r.code === 1 && /C2-engine-missing/.test(r.out),
  code: r.code,
});
renameSync(RULES_BAK, RULES);

/* F2：删掉 mono 那行的反引号 */
{
  restoreAll();
  const next = conOrig.replace('| `mono` |', '| mono |');
  if (next === conOrig) results.push({ name: 'F2 删反引号', ok: null, code: -1 });
  else {
    writeFileSync(CON, next, 'utf8');
    r = run();
    results.push({
      name: 'F2 删掉 mono 的反引号 → C6 必须报（旧版静默 5→4）',
      ok: /C6-allow-rows-unparsed/.test(r.out),
      code: r.code,
    });
    restoreAll();
  }
}

/* F3：C5 是否报出那两条不可能 FAIL 的规则 */
{
  restoreAll();
  r = run();
  results.push({
    name: 'F3 C5 必须报 font-fallback/measure 没有 FAIL 分支',
    ok: /C5-allow-rule-cannot-fail/.test(r.out) && /font-fallback/.test(r.out),
    code: r.code,
  });
}

/* F4（反向）：一切正常时必须 exit 0 */
{
  restoreAll();
  r = run();
  results.push({ name: 'F4（反向）恢复后必须 exit 0', ok: r.code === 0, code: r.code });
}

restoreAll();
console.log('');
for (const x of results) {
  console.log(`${x.ok === true ? '✓' : x.ok === false ? '✗' : '?'}  ${x.name}   （exit=${x.code}）`);
}
const passed = results.filter((x) => x.ok === true).length;
console.log(`\n═══ fail-open 修复验证: ${passed}/${results.length} ═══`);

r = run();
console.log(`恢复后: exit=${r.code}  ${(r.out.match(/合计 FAIL \d+ \/ WARN \d+ \/ INFO \d+/) || [''])[0]}`);
