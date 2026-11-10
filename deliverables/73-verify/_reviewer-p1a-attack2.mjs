/* P1a 验收：对**当前版本**闸门的对抗性测试（字节级备份与还原，还原后断言 sha 相同）。
 *
 * A. §6 表格插反引号规则行 —— v1 会假绿（把 §6 表 import 进允许表），新版应免疫
 * B. C4 的否定句误报 —— 文档写「此前那句 17 处是我的错，实测 0」时，C4 会不会把
 *    否定句当成"欠款声称"而报红（假阳性）
 * C. C1 的 has() 语义 —— id 为 ""/undefined/数组/对象 时是放过还是崩
 * D. C2 引擎缺失 —— fail-open 还是 fail-closed
 */
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const CON = `${ROOT}/prototypes/_CONTRACT.md`;
const REP = `${ROOT}/prototypes/S08-amber-overprint-lightbox/.inspect/report.json`;
const EN = `${ROOT}/README-EN.md`;
const RULES = `${ROOT}/tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs`;
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 16);

const run = () => {
  const r = spawnSync(process.execPath, ['prototypes/_build/check-contract.mjs'], { cwd: ROOT, encoding: 'utf8' });
  return { c: r.status, o: String(r.stdout || '') + String(r.stderr || '') };
};
const brief = (r) => r.o.split(/\r?\n/).filter((l) => /C1 FAIL|C2 允许|C3 登记|合计|C4-|C0-|C1-fail|C2-allow|Error/.test(l)).join(' ⏎ ').slice(0, 400);

const test = (name, mutate, files) => {
  const backups = files.map((f) => ({ f, buf: readFileSync(f), h: sha(f) }));
  mutate();
  const r = run();
  let ok = true;
  for (const b of backups) {
    writeFileSync(b.f, b.buf);
    if (sha(b.f) !== b.h) ok = false;
  }
  console.log(`\n### ${name}`);
  console.log(`   exit=${r.c}`);
  console.log('   ' + (brief(r) || '(无摘要)'));
  console.log('   还原 sha 全部一致: ' + ok);
  return { r, ok };
};

console.log('=== 初始 ===');
console.log('  contract=' + sha(CON) + ' readmeEN=' + sha(EN) + ' s08=' + sha(REP) + ' gate=' + readFileSync(`${ROOT}/prototypes/_build/check-contract.mjs`).length + 'B');

/* A. §6 表插反引号行 */
test('A  §6 表格插一行 `shadow` 假登记', () => {
  const s = readFileSync(CON, 'utf8');
  writeFileSync(CON, s.replace('| **不得横向溢出** |', '| `shadow` | X | Y |\n| **不得横向溢出** |'), 'utf8');
}, [CON]);

/* A2. 在 L110 §6 行内部写 §9.15（v1 的 indexOf 陷阱） */
test('A2 §6 表里插一行含 "9.15" 的引用 + 反引号规则名', () => {
  const s = readFileSync(CON, 'utf8');
  writeFileSync(CON, s.replace('| **不得横向溢出** |', '| 见 §9.15 允许表：| `covered-text` | x |\n| **不得横向溢出** |'), 'utf8');
}, [CON]);

/* B. C4 否定句误报 */
test('B  C4：README-EN 里加一句"此前说 17 处未清是错的，实测 0"', () => {
  const s = readFileSync(EN, 'utf8');
  const add = '\nAn earlier revision said `S13` `shadow` (17 occurrences) was genuinely unresolved; that was wrong — report.json shows `shadow` findings = 0.\n';
  writeFileSync(EN, s + add, 'utf8');
}, [EN]);

/* C. 畸形 id */
test('C1 C1：给 S08 加一条 id 为 "" 的 FAIL', () => {
  const j = JSON.parse(readFileSync(REP, 'utf8'));
  j.findings.push({ level: 'FAIL', id: '', width: 1440, message: '空 id' });
  writeFileSync(REP, JSON.stringify(j, null, 1), 'utf8');
}, [REP]);

test('C2 C1：给 S08 加一条**没有 id 字段**的 FAIL', () => {
  const j = JSON.parse(readFileSync(REP, 'utf8'));
  j.findings.push({ level: 'FAIL', width: 1440, message: '无 id' });
  writeFileSync(REP, JSON.stringify(j, null, 1), 'utf8');
}, [REP]);

test('C3 C1：给 S08 加一条 id 为对象的 FAIL', () => {
  const j = JSON.parse(readFileSync(REP, 'utf8'));
  j.findings.push({ level: 'FAIL', id: { toString: 1 }, width: 1440, message: '对象 id' });
  writeFileSync(REP, JSON.stringify(j, null, 1), 'utf8');
}, [REP]);

test('C4 C1：给 S08 加一条 id 为 ["mono"] 的 FAIL', () => {
  const j = JSON.parse(readFileSync(REP, 'utf8'));
  j.findings.push({ level: 'FAIL', id: ['mono'], width: 1440, message: '数组 id' });
  writeFileSync(REP, JSON.stringify(j, null, 1), 'utf8');
}, [REP]);

/* D. 引擎缺失 */
test('D  C2：把 rules.mjs 移走', () => {
  renameSync(RULES, RULES + '.probe-bak');
}, []);
// 单独还原 rules
if (existsSync(RULES + '.probe-bak')) renameSync(RULES + '.probe-bak', RULES);
console.log('   rules.mjs 已还原: ' + existsSync(RULES));

console.log('\n=== 收尾 ===');
console.log('  contract=' + sha(CON) + ' readmeEN=' + sha(EN) + ' s08=' + sha(REP));
