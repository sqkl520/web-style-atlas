/* P1a 验收探针：攻击 check-contract.mjs 的三个判据。
 *
 * 纪律：每个变异都先做字节级备份，跑完立刻还原，并用 sha256 断言还原成功。
 * 只用 Node 读写（PowerShell 的 Set-Content 会改编码/换行，契约文件会被污染）。
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, rmSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const CON = `${ROOT}/prototypes/_CONTRACT.md`;
const REP = `${ROOT}/prototypes/S08-amber-overprint-lightbox/.inspect/report.json`;
const RULES = `${ROOT}/tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs`;
const GATE = 'node prototypes/_build/check-contract.mjs';

const sha = (b) => createHash('sha256').update(b).digest('hex');
const bak = (p) => ({ path: p, buf: readFileSync(p), sha: sha(readFileSync(p)) });
const restore = (b) => writeFileSync(b.path, b.buf);
const ok = (b) => sha(readFileSync(b.path)) === b.sha;

const run = () => {
  try {
    return { code: 0, out: execSync(GATE, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
};
const brief = (r) => (r.out.split(/\r?\n/).filter((l) => /C1 FAIL|C2 允许|C3 登记|合计|C2-allow|C1-fail|WARN/.test(l)).join(' ⏎ ') || '(无摘要)').slice(0, 460);

const log = [];
const push = (name, question, r, note) => {
  log.push({ name, question, exit: r.code, brief: brief(r), note });
  console.log(`\n### ${name}\n  问题：${question}\n  exit=${r.code}`);
  console.log('  ' + brief(r));
  if (note) console.log('  → ' + note);
};

mkdirSync(`${ROOT}/deliverables/73-verify/_bk`, { recursive: true });

/* ══ 攻击 C2 的解析：① 删掉 mono 行的一个反引号 ══ */
{
  const b = bak(CON);
  const s = b.buf.toString('utf8');
  const mutated = s.replace('| `mono` |', '| mono |');
  if (mutated === s) throw new Error('找不到 mono 行');
  writeFileSync(CON, mutated, 'utf8');
  const r = run();
  push('T1 C2 解析：删掉 mono 的反引号', '允许表少解析一行时，闸门会报 C2 还是静默漏掉？', r,
    /C2-allow-rule-not-in-engine/.test(r.out) ? '报了 C2' : '**没有报 C2**（行被静默丢弃，允许表从 5 缩到 4）');
  restore(b);
  console.log('  还原 ok=' + ok(b));
}

/* ══ 攻击 C2 的解析：② 规则名大小写 ══ */
{
  const b = bak(CON);
  const s = b.buf.toString('utf8');
  writeFileSync(CON, s.replace('| `mono` |', '| `Mono` |'), 'utf8');
  const r = run();
  push('T2 C2 解析：mono → Mono（大小写）', '表里名字大小写不同会怎样？', r,
    /C2-allow-rule-not-in-engine/.test(r.out) ? '报 C2（case 敏感，方向正确但会被当成"表在腐化"）' : '未报 C2');
  restore(b);
  console.log('  还原 ok=' + ok(b));
}

/* ══ 攻击 C2 的解析：③ 表格里多一列 / 单元格里带 | ══ */
{
  const b = bak(CON);
  const s = b.buf.toString('utf8');
  const mutated = s.replace('| `measure` | 见 §9.14 的 0.5em 假设 | 把报数除以 2 再判断 |',
    '| `measure` | 见 §9.14 | 的 0.5em 假设 | 把报数除以 2 再判断 |');
  if (mutated === s) throw new Error('找不到 measure 行');
  writeFileSync(CON, mutated, 'utf8');
  const r = run();
  push('T3 C2 解析：measure 行里插一个多余 |', '列错位会不会影响判定？', r,
    '列错位只污染 why/how 文本，判定仍靠第一列正则');
  restore(b);
  console.log('  还原 ok=' + ok(b));
}

/* ══ 攻击解析窗口：§6 表格里插一行反引号规则名 ══ */
{
  const b = bak(CON);
  const s = b.buf.toString('utf8');
  const anchor = '| **不得横向溢出** |';
  if (!s.includes(anchor)) throw new Error('找不到 §6 表格行');
  writeFileSync(CON, s.replace(anchor, '| `covered-text` | 探针插入的假登记 | 无 |\n' + anchor), 'utf8');
  const r = run();
  const wide = /C3 登记但无案触发（INFO）\s+(\d+)/.exec(r.out);
  push('T4 解析窗口：在 §6 表格里插一行 `covered-text`', '允许表是 194–203 行，还是 110–203 行（从 §6 表格里第一次出现 "9.15" 起）？', r,
    wide ? `C3 无触发条数=${wide[1]}（原为 3）。若变成 4，说明 §6 表格的行被算进了允许表` : '读不到 C3 计数');
  restore(b);
  console.log('  还原 ok=' + ok(b));
}

/* ══ 攻击 C2 的引擎侧：rules.mjs 不可读 ══ */
{
  const b = bak(RULES);
  renameSync(RULES, RULES + '.p1a-bak');
  const r = run();
  push('T5 引擎不可读：把 rules.mjs 移走', 'C2 判定不了时是红还是绿？', r,
    r.code === 0 ? '**exit 0（fail-open）**：引擎没了，闸门仍然绿，只留一条 WARN' : 'exit ' + r.code);
  renameSync(RULES + '.p1a-bak', RULES);
  console.log('  还原 ok=' + ok(b));
}

/* ══ 攻击 C1 的数据面：删掉唯一有 FAIL 的案的 report ══ */
{
  const b = bak(REP);
  renameSync(REP, REP + '.p1a-bak');
  const r = run();
  push('T6 数据缺失：把 S08 的 report.json 移走', '唯一两处 FAIL 的来源消失后，闸门会红吗？', r,
    r.code === 0 ? '**exit 0（fail-open）**：整个案的证据消失，闸门反而变绿 0/0' : 'exit ' + r.code);
  renameSync(REP + '.p1a-bak', REP);
  console.log('  还原 ok=' + ok(b));
}

/* ══ 攻击 C1 的判据：id 是对象（toString 返回非原始值）══ */
{
  const b = bak(REP);
  const j = JSON.parse(b.buf.toString('utf8'));
  j.findings.push({ level: 'FAIL', id: { toString: 1 }, width: 1440, message: '对象 id' });
  writeFileSync(REP, JSON.stringify(j, null, 1), 'utf8');
  const r = run();
  push('T7 C1 判据：id 是对象', '畸形 id 会不会被静默放过，或者直接把闸门打崩？', r,
    /TypeError/.test(r.out) ? '崩栈（TypeError: Cannot convert object to primitive value）——exit 1，方向上 fail-closed，但输出不可读' : '未崩');
  restore(b);
  console.log('  还原 ok=' + ok(b));
}

/* ══ 基线：全部还原后再跑一次 ══ */
const base = run();
console.log('\n═══ 还原后基线 ═══');
console.log(`  exit=${base.code}  ${(base.out.match(/合计 FAIL \d+ \/ WARN \d+ \/ INFO \d+/) || [''])[0]}`);

writeFileSync(`${ROOT}/deliverables/73-verify/_bk/attack-results.json`, JSON.stringify(log, null, 2), 'utf8');
console.log('  结果已写入 deliverables/73-verify/_bk/attack-results.json');
