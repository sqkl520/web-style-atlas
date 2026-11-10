/* check-contract.mjs 的完整变异测试（v2）。
 *
 * v1 只测了 4 个变异，漏掉了规划 Agent 找出的两个真缺陷。
 * v2 覆盖 9 个，其中 3 个是「修复前会假绿、修复后必须变红」的关键对：
 *   M1b §6 表里塞一条反引号规则（旧 indexOf 切片会把它算进允许表）→ 必须红
 *   M5  删掉某案 report.json  → 必须红（"无法判定"不是"成立"）
 *   M6  写坏某案 report.json  → 必须红
 *
 * 以及 2 个反向测试（必须仍绿）：
 *   M2  把 FAIL 换成允许表内另一条规则
 *   M4  往 §6 表塞一条**加粗不带反引号**的规则（不应被当成允许规则）
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const CHK = `${ROOT}/prototypes/_build/check-contract.mjs`;
const CON = `${ROOT}/prototypes/_CONTRACT.md`;
const REP = `${ROOT}/prototypes/S08-amber-overprint-lightbox/.inspect/report.json`;

const orig = {
  chk: readFileSync(CHK, 'utf8'),
  con: readFileSync(CON, 'utf8'),
  rep: readFileSync(REP, 'utf8'),
};

/* ⚠️ 2026-10-31 修 bug：v1 的 restore() 只在**每个变异末尾**调用一次，
 * 而 M1a 写入的 `invented-rule` 是 push 到 findings 数组后整体写回的 ——
 * 若某次 restore 与下一次写入交错（或某变异提前 return 忘了 restore），
 * 残留会带进下一个变异，导致"M1b 报了两条 C1"这种串味。
 * 实测后果：v1 跑完一次后仓库留着一条 `shadow` FAIL，check-contract 变 exit 1。
 *
 * 修法：restore() 改为**每个变异开始前和结束后都调用**，并且是幂等的
 * （从内存里的 orig 完整重写三个文件）。 */
const restore = () => {
  writeFileSync(CHK, orig.chk, 'utf8');
  writeFileSync(CON, orig.con, 'utf8');
  writeFileSync(REP, orig.rep, 'utf8');
};

const run = () => {
  try {
    return { code: 0, out: execSync('node prototypes/_build/check-contract.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
};

const results = [];
const mark = (name, ok, res, expect) => results.push({ name, ok, res, expect });

/* ── 基线 ── */
console.log('═══ 基线 ═══');
let r = run();
const baseOk = r.code === 0;
console.log(`  exit=${r.code}  ${(r.out.match(/合计 FAIL \d+ \/ WARN \d+ \/ INFO \d+/) || [''])[0]}`);
if (!baseOk) { console.log('  ⚠ 基线不绿，终止'); process.exit(1); }

/* ── M1a：允许表外的新 FAIL（基本功能）── */
restore();
{
  const j = JSON.parse(orig.rep);
  j.findings.push({ level: 'FAIL', id: 'invented-rule', width: 1440, message: 'x', fix: '' });
  writeFileSync(REP, JSON.stringify(j, null, 2), 'utf8');
  const res = run();
  mark('M1a 允许表外的新 FAIL → 必须红', res.code === 1 && /C1-fail-not-in-allowlist/.test(res.out), res, 'exit 1');
  restore();
}

/* ── M1b：往 §6 表塞一条**反引号**规则 + 一条该规则的 FAIL ──
 * 这是旧 indexOf 切片的假绿证据：旧版会把 §6 的行算进允许表。 */
restore();
{
  const conNext = orig.con.replace('| **不得横向溢出** |', '| `shadow` | 变异测试塞进来的假允许 | 不管 |\n| **不得横向溢出** |');
  if (conNext === orig.con) { mark('M1b §6 塞反引号规则 → 必须红', null, { code: -1, out: '锚点未找到' }, 'exit 1'); }
  else {
    writeFileSync(CON, conNext, 'utf8');
    const j = JSON.parse(orig.rep);
    j.findings.push({ level: 'FAIL', id: 'shadow', width: 1440, message: 'x', fix: '' });
    writeFileSync(REP, JSON.stringify(j, null, 2), 'utf8');
    const res = run();
    mark('M1b §6 塞反引号规则 + shadow FAIL → 必须红', res.code === 1 && /C1-fail-not-in-allowlist/.test(res.out), res, 'exit 1');
    restore();
  }
}

/* ── M2（反向）：把 FAIL 换成允许表内的另一条规则 → 必须仍绿 ── */
restore();
{
  const j = JSON.parse(orig.rep);
  j.findings = j.findings.map((f) => (f.level === 'FAIL' ? { ...f, id: 'mono' } : f));
  writeFileSync(REP, JSON.stringify(j, null, 2), 'utf8');
  const res = run();
  mark('M2（反向）FAIL 换成允许表内的规则 → 必须绿', res.code === 0 && /C1 FAIL 全在允许表内\s+2\/2/.test(res.out), res, 'exit 0');
  restore();
}

/* ── M3：允许表里一条规则名改成不存在的 → C2 必须红 ── */
restore();
{
  const conNext = orig.con.replace('| `mono` |', '| `mono-typo` |');
  if (conNext === orig.con) { mark('M3 允许表规则名改错 → C2 红', null, { code: -1, out: '锚点未找到' }, 'exit 1'); }
  else {
    writeFileSync(CON, conNext, 'utf8');
    const res = run();
    mark('M3 允许表规则名改错 → C2 必须红', res.code === 1 && /C2-allow-rule-not-in-engine/.test(res.out), res, 'exit 1');
    restore();
  }
}

/* ── M4（反向）：往 §6 塞**加粗无反引号**规则 → 不该被当成允许规则，但因为没有对应 FAIL，仍应绿 ── */
restore();
{
  const conNext = orig.con.replace('| **不得横向溢出** |', '| **shadow** | 变异：加粗无反引号 | 不管 |\n| **不得横向溢出** |');
  if (conNext === orig.con) { mark('M4（反向）§6 塞加粗规则', null, { code: -1, out: '锚点未找到' }, 'exit 0'); }
  else {
    writeFileSync(CON, conNext, 'utf8');
    const res = run();
    mark('M4（反向）§6 塞加粗无反引号规则 → 仍绿', res.code === 0, res, 'exit 0');
    restore();
  }
}

/* ── M5：删掉 report.json → 必须红（"无法判定"≠"成立"）── */
restore();
{
  const bak = orig.rep;
  unlinkSync(REP);
  const res = run();
  mark('M5 删掉 report.json → 必须红', res.code === 1 && /C0-report-missing/.test(res.out), res, 'exit 1');
  writeFileSync(REP, bak, 'utf8');
}

/* ── M6：写坏 report.json → 必须红 ── */
restore();
{
  writeFileSync(REP, '{ 这不是 JSON', 'utf8');
  const res = run();
  mark('M6 写坏 report.json → 必须红', res.code === 1 && /C0-report-unreadable/.test(res.out), res, 'exit 1');
  writeFileSync(REP, orig.rep, 'utf8');
}

/* ── M7：删掉 §9.15 标题 → 必须抛错/非零 ── */
restore();
{
  const conNext = orig.con.replace('**9.15 四条对中文站结构性不利的规则', '**9,15 四条对中文站结构性不利的规则');
  if (conNext === orig.con) { mark('M7 删 §9.15 标题', null, { code: -1, out: '锚点未找到' }, 'exit≠0'); }
  else {
    writeFileSync(CON, conNext, 'utf8');
    const res = run();
    mark('M7 §9.15 标题被改坏 → 必须非零退出', res.code !== 0, res, 'exit≠0');
    restore();
  }
}

/* ── 汇总 ── */
restore();
console.log('');
for (const x of results) {
  const m = x.ok === true ? '✓' : x.ok === false ? '✗' : '?';
  console.log(`${m}  ${x.name}   （期望 ${x.expect}，实得 exit=${x.res.code}）`);
  if (x.ok === false) {
    console.log('      ' + String(x.res.out).split('\n').filter((l) => /C0|C1|C2|合计|Error/.test(l)).slice(0, 4).join('\n      '));
  }
}
const passed = results.filter((x) => x.ok === true).length;
console.log(`\n═══ 变异测试: ${passed}/${results.length} ═══`);

r = run();
console.log(`恢复后: exit=${r.code}  ${(r.out.match(/合计 FAIL \d+ \/ WARN \d+ \/ INFO \d+/) || [''])[0]}`);
