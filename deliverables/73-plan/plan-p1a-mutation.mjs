/* plan-p1a-mutation.mjs — P1a 的变异测试（可执行，不是纸面设计）
 *
 * 做法：在 deliverables/73-plan/_mut/p1a/ 下搭一个**镜像仓库**
 *   _mut/p1a/prototypes/_CONTRACT.md            ← 真文件逐字节复制
 *   _mut/p1a/prototypes/Sxx-*\/.inspect/report.json ← 真文件逐字节复制
 *   _mut/p1a/prototypes/_build/check-contract.mjs   ← 真检查器逐字节复制
 *   _mut/p1a/tools/taste-skill/.../lib/rules.mjs    ← 真引擎逐字节复制
 * 因为 check-contract.mjs 的 ROOT = `new URL('../..', import.meta.url)`，
 * 放进镜像仓库的 `prototypes/_build/` 之后，它读的就是**镜像**里的契约与报告。
 * 于是可以在镜像里任意改坏，真仓库一个字节都不动。
 *
 * 每个用例断言两件事：退出码、以及输出里是否出现那条该响的规则。
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const FX = join(HERE, '_mut', 'p1a');
const P = join(ROOT, 'prototypes');

function buildFixture() {
  rmSync(FX, { recursive: true, force: true });
  mkdirSync(join(FX, 'prototypes', '_build'), { recursive: true });
  mkdirSync(join(FX, 'tools', 'taste-skill', 'skills', 'taste-skill', 'scripts', 'lib'), { recursive: true });
  cpSync(join(P, '_CONTRACT.md'), join(FX, 'prototypes', '_CONTRACT.md'));
  cpSync(join(ROOT, 'tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs'),
    join(FX, 'tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs'));
  cpSync(join(P, '_build', 'check-contract.mjs'), join(FX, 'prototypes', '_build', 'check-contract.mjs'));
  for (const d of readdirSync(P, { withFileTypes: true })) {
    if (!d.isDirectory() || !/^S\d{2}-/.test(d.name)) continue;
    const rep = join(P, d.name, '.inspect', 'report.json');
    if (!existsSync(rep)) continue;
    mkdirSync(join(FX, 'prototypes', d.name, '.inspect'), { recursive: true });
    cpSync(rep, join(FX, 'prototypes', d.name, '.inspect', 'report.json'));
  }
}

function run() {
  try {
    const out = execFileSync(process.execPath, [join(FX, 'prototypes', '_build', 'check-contract.mjs')],
      { encoding: 'utf8', cwd: FX });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || '') + (e.stderr || '') };
  }
}

/* 镜像里的「第一个有 FAIL 的案」——用来做 M6，不硬编码 S08 */
function firstFailCase() {
  for (const d of readdirSync(join(FX, 'prototypes'), { withFileTypes: true })) {
    if (!d.isDirectory() || !/^S\d{2}-/.test(d.name)) continue;
    const p = join(FX, 'prototypes', d.name, '.inspect', 'report.json');
    const j = JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
    if ((j.findings || []).some((f) => f.level === 'FAIL')) return { dir: d.name, path: p };
  }
  return null;
}

const results = [];
function check(name, expectCode, mustMatch, mustNotMatch, note) {
  const r = run();
  const codeOk = r.code === expectCode;
  const mOk = mustMatch ? mustMatch.test(r.out) : true;
  const nOk = mustNotMatch ? !mustNotMatch.test(r.out) : true;
  results.push({ name, pass: codeOk && mOk && nOk, code: r.code, expectCode, note, out: r.out });
  return r;
}

/* ── 基线 ── */
buildFixture();
const base = check('基线（未变异）', 0, /合计 FAIL 0/, null, '干净仓库必须绿');

/* ── M1：从 §6 表里"侧门"加一行允许规则（解析器边界缺陷）──
 * `_CONTRACT.md` 里 `indexOf('9.15')` 首次出现是 **L110**（§6 表里那句
 * "不许横向溢出"上方引用了 §9.15），而真正的 §9.15 标题在 **L194**。
 * 于是解析切片从 L110 开始 —— §6 表整个落在切片里。
 * 只要有人在 §6 写一行形如 `| \`shadow\` | … | … |`，它就会被当成允许项。 */
const contractPath = join(FX, 'prototypes', '_CONTRACT.md');
const origContract = readFileSync(contractPath, 'utf8');
writeFileSync(contractPath, origContract.replace(
  '| **不得横向溢出** |', '| `shadow` | 侧门注入 | 见 §9.15 |\n| **不得横向溢出** |'), 'utf8');
const m1a = check('M1a 只在 §6 侧门加一行（尚无 shadow FAIL）', 0, /C3-allow-rule-unused/,
  null, '允许表被撑大 → 应出现在 C3 的 unused 列表里');

/* ── M1b：侧门 + 一条 shadow FAIL → 真正的危害 ── */
const ff = firstFailCase();
const ffJson = JSON.parse(readFileSync(ff.path, 'utf8').replace(/^\uFEFF/, ''));
ffJson.findings = (ffJson.findings || []).concat([{ level: 'FAIL', id: 'shadow', width: 1440, message: '17 box-shadow(s) on elements at rest', fix: 'x' }]);
writeFileSync(ff.path, JSON.stringify(ffJson, null, 1), 'utf8');
const m1b = check('M1b 侧门 + 一条 shadow FAIL（未修解析器）', 0, null, /C1-fail-not-in-allowlist/,
  '★ 这就是假绿：shadow 从未被正式登记，却因 §6 某行而被放行');

/* ── M1c：修好解析器（切片从 §9.15 标题行开始）后重跑同一个镜像 ── */
const chkPath = join(FX, 'prototypes', '_build', 'check-contract.mjs');
const origChk = readFileSync(chkPath, 'utf8');
const patched = origChk.replace(
  "  const i = md.indexOf('9.15');",
  "  const hm = md.match(/^\\*\\*9\\.15[^\\n]*/m);\n  const i = hm ? hm.index : md.indexOf('9.15');");
if (patched === origChk) throw new Error('打补丁失败：没找到 indexOf(\'9.15\') 那一行');
writeFileSync(chkPath, patched, 'utf8');
const m1c = check('M1c 修好解析器后，同一个镜像必须红', 1, /C1-fail-not-in-allowlist/,
  null, '★ 同一变异，修解析器后必须被抓 —— 这条证明修复真的起作用');

/* 还原检查器与契约 */
writeFileSync(chkPath, origChk, 'utf8');
writeFileSync(contractPath, origContract, 'utf8');
ffJson.findings = ffJson.findings.filter((f) => f.id !== 'shadow');
writeFileSync(ff.path, JSON.stringify(ffJson, null, 1), 'utf8');

/* ── M2：删掉 §9.15 里的一行 → 那一条 FAIL 必须越界 ── */
const failIds = JSON.parse(readFileSync(ff.path, 'utf8')).findings.filter((f) => f.level === 'FAIL').map((f) => f.id);
const victim = failIds[0];
const re = new RegExp('^\\|\\s*`' + victim + '`\\s*\\|.*$', 'm');
if (!re.test(origContract)) throw new Error('找不到要删的允许行：' + victim);
writeFileSync(contractPath, origContract.replace(re, ''), 'utf8');
check(`M2 从 §9.15 删掉 \`${victim}\` 那一行`, 1, /C1-fail-not-in-allowlist/,
  null, `该 FAIL 立刻越界（规则名 ${victim}）`);
writeFileSync(contractPath, origContract, 'utf8');

/* ── M3：把允许表里的规则名改成引擎里不存在的 → C2 必须红 ── */
writeFileSync(contractPath,
  origContract.replace(new RegExp('`' + victim + '`', 'g'), '`' + victim + '-typo`'), 'utf8');
check(`M3 把 \`${victim}\` 拼成 \`${victim}-typo\``, 1, /C2-allow-rule-not-in-engine/,
  null, 'C2 查的是「表登记的规则引擎里真的有吗」');
writeFileSync(contractPath, origContract, 'utf8');

/* ── M4：给一个干净的案加一条越界 FAIL → C1 必须红 ── */
let clean = null;
for (const d of readdirSync(join(FX, 'prototypes'), { withFileTypes: true })) {
  if (!d.isDirectory() || !/^S\d{2}-/.test(d.name)) continue;
  const p = join(FX, 'prototypes', d.name, '.inspect', 'report.json');
  const j = JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
  if (!(j.findings || []).some((f) => f.level === 'FAIL')) { clean = { dir: d.name, p, j }; break; }
}
clean.j.findings = clean.j.findings.concat([{ level: 'FAIL', id: 'hairline', width: 1440, message: '12 hairlines', fix: 'x' }]);
writeFileSync(clean.p, JSON.stringify(clean.j, null, 1), 'utf8');
check(`M4 给 ${clean.dir.slice(0, 3)} 注入一条 \`hairline\` FAIL`, 1, /C1-fail-not-in-allowlist/,
  null, '新 FAIL 不在允许表 = 契约被破坏');

/* ── M5：删掉一份 report.json → 现在是 WARN，退出码仍是 0（记录为缺口）── */
rmSync(join(FX, 'prototypes', clean.dir, '.inspect', 'report.json'));
const m5 = check(`M5 删掉 ${clean.dir.slice(0, 3)} 的 report.json`, 0, /C0-report-missing/,
  null, '★★ 缺口：报告缺失只报 WARN、exit 0 —— "无法判定"被当成了"成立"');

/* ── M6：report.json 损坏 → 同上 ── */
writeFileSync(join(FX, 'prototypes', clean.dir, '.inspect', 'report.json'), '{"findings": [', 'utf8');
const m6 = check(`M6 ${clean.dir.slice(0, 3)} 的 report.json 写成非法 JSON`, 0, /C0-report-unreadable/,
  null, '★★ 同一缺口：解析失败也只报 WARN');

/* ── 输出 ── */
console.log('═══ P1a · check-contract.mjs 变异测试 ═══\n');
console.log('  这一组跑在镜像仓库 deliverables/73-plan/_mut/p1a/ 上，真仓库零改动。\n');
for (const r of results) {
  console.log(`  ${r.pass ? '✓' : '✗'} ${r.name}`);
  console.log(`      exit=${r.code}（期望 ${r.expectCode}）  ${r.note}`);
}
const bad = results.filter((r) => !r.pass);
console.log(`\n  通过 ${results.length - bad.length}/${results.length}`);
if (bad.length) {
  console.log('\n  ✗ 未通过：');
  for (const b of bad) console.log(`     ${b.name}\n${b.out.split('\n').slice(0, 12).map((l) => '        ' + l).join('\n')}`);
}
console.log('\n  ── 结论 ──');
console.log('  M1b 不通过是**预期的**：它记录的是当前 check-contract.mjs 的真实缺陷');
console.log('  （§6 里任何一行反引号开头、三列的行都会被算成"允许规则"）。');
console.log('  M1c 证明补上「从 §9.15 标题行开始切片」之后，同一变异立刻被抓。');
console.log('  M5/M6 不通过也是预期的：报告缺失/损坏只报 WARN ⇒ exit 0 ⇒ 契约"成立"。');
console.log('  这两条不属于 P1a 的原始范围，但属于同一个假绿家族，建议一并治。');
