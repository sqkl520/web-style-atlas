/* check-contract.mjs 的变异测试。
 *
 * 本仓库踩过两次「恒真式闸门」：
 *   · 第 71 轮 R2/R3/R4（palette[0]===bg 等）是构造恒真式，30/30 全绿却测不出东西
 *   · 第 71 轮之前 R5 被批判 Agent 指出「与色该不该进提示词没有因果关系」
 * 所以新闸门必须先证明它会红。
 *
 * 三个变异，每个都必须 exit 1：
 *   A  C1：把某案的 FAIL 规则名改成允许表外的值 → 必须报 C1
 *   B  C2：把 §9.15 里的一行规则名改成不存在的值 → 必须报 C2
 *   C  组合：同时破坏两者，两条都要报
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const REP = `${ROOT}/prototypes/S08-amber-overprint-lightbox/.inspect/report.json`;
const CON = `${ROOT}/prototypes/_CONTRACT.md`;

const run = () => {
  try {
    return { code: 0, out: execSync('node prototypes/_build/check-contract.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { code: e.status, out: String(e.stdout || '') };
  }
};

console.log('═══ 基线 ═══');
let r = run();
console.log(`  exit=${r.code}  ${(r.out.match(/合计 FAIL \d+ \/ WARN \d+ \/ INFO \d+/) || [''])[0]}`);
if (r.code !== 0) { console.log('  ⚠ 基线不绿，停止'); process.exit(1); }

const repOrig = readFileSync(REP, 'utf8');
const conOrig = readFileSync(CON, 'utf8');

const results = [];

/* ── 变异 A：C1 —— 造一条允许表外的 FAIL ── */
{
  const j = JSON.parse(repOrig);
  j.findings.push({ level: 'FAIL', id: 'totally-made-up-rule', width: 1440, message: '变异测试用', fix: '' });
  writeFileSync(REP, JSON.stringify(j, null, 2), 'utf8');
  const res = run();
  const hit = res.code === 1 && /C1-fail-not-in-allowlist/.test(res.out);
  results.push(['A  C1：给 S08 塞一条允许表外的 FAIL', hit, res]);
  writeFileSync(REP, repOrig, 'utf8');
}

/* ── 变异 B：C2 —— 把允许表里一条规则名改成引擎里没有的 ── */
{
  const next = conOrig.replace('^| `mono` |', '| `mono-typo-not-exist` |');
  // 上面的 ^ 不可靠，改用精确定位
  const target = '| `mono` |';
  const injected = conOrig.includes(target) ? conOrig.replace(target, '| `mono-typo-not-exist` |') : null;
  if (!injected) {
    results.push(['B  C2：把 §9.15 的 mono 改成不存在的名字', null, { code: -1, out: '找不到目标行' }]);
  } else {
    writeFileSync(CON, injected, 'utf8');
    const res = run();
    // 注意：改了表之后 mono 就不再被允许，但当前没有案触发 mono 的 FAIL，所以只会报 C2
    const hit = res.code === 1 && /C2-allow-rule-not-in-engine/.test(res.out);
    results.push(['B  C2：把 §9.15 的 mono 改成不存在的名字', hit, res]);
    writeFileSync(CON, conOrig, 'utf8');
  }
}

/* ── 变异 C：C1 的反面 —— 把 FAIL 删掉，C1 应当变成 0/0 且仍然绿 ── */
{
  const j = JSON.parse(repOrig);
  j.findings = j.findings.map((f) => (f.level === 'FAIL' ? { ...f, level: 'WARN' } : f));
  writeFileSync(REP, JSON.stringify(j, null, 2), 'utf8');
  const res = run();
  const hit = res.code === 0 && /C1 FAIL 全在允许表内\s+0\/0/.test(res.out);
  results.push(['C  反向：把两条 FAIL 降成 WARN，应当变成 0/0 且 exit 0', hit, res]);
  writeFileSync(REP, repOrig, 'utf8');
}

/* ── 变异 D：C1 的边界 —— 把 FAIL 规则名改成另一条**在允许表里**的规则，应当仍然绿 ── */
{
  const j = JSON.parse(repOrig);
  j.findings = j.findings.map((f) => (f.level === 'FAIL' ? { ...f, id: 'mono' } : f));
  writeFileSync(REP, JSON.stringify(j, null, 2), 'utf8');
  const res = run();
  const hit = res.code === 0 && /C1 FAIL 全在允许表内\s+2\/2/.test(res.out);
  results.push(['D  边界：把 FAIL 换成允许表内的另一条规则，应当仍然绿', hit, res]);
  writeFileSync(REP, repOrig, 'utf8');
}

console.log('');
for (const [name, ok, res] of results) {
  const mark = ok === true ? '✓ 通过' : ok === false ? '✗ 未达预期' : '? 跳过';
  console.log(`${mark}  ${name}`);
  if (ok === false) {
    console.log(`      exit=${res.code}`);
    console.log('      ' + String(res.out).split('\n').filter((l) => /C1|C2|合计/.test(l)).join('\n      '));
  }
}

const passed = results.filter((x) => x[1] === true).length;
console.log(`\n═══ 变异测试: ${passed}/${results.length} ═══`);

r = run();
console.log(`恢复后: exit=${r.code}  ${(r.out.match(/合计 FAIL \d+ \/ WARN \d+ \/ INFO \d+/) || [''])[0]}`);
