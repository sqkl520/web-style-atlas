/* P1a 验收探针 #2：证明「允许表可被文档别处的表格行静默撑大」。
 *
 * 这是 parseAllowTable() 的边界 bug 的直接利用：
 *   const i = md.indexOf('9.15')   ← 命中的是 L110 §6 表格里那句「不在 §9.15 允许表内」
 *   const j = md.indexOf('9.16', i) ← L203
 * 于是扫描窗口 = L110..L203（94 行），包含 §6 硬约束表、§7、§8、§9.1–§9.15。
 * 任何一行形如「| `规则名` | …」的表格行都会被 import 进允许表。
 *
 * 攻击目标选 `shadow`（rules.mjs 里确有 'FAIL' 分支，是可 FAIL 的规则），
 * 且契约 L110 自己写着「S13 的 17 处 shadow + button-fx 属真未修，不在 §9.15 允许表内」。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const CON = `${ROOT}/prototypes/_CONTRACT.md`;
const GATE = 'node prototypes/_build/check-contract.mjs';
const sha = (b) => createHash('sha256').update(b).digest('hex');

const run = (extra = '') => {
  try {
    return { code: 0, out: execSync(GATE + extra, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') }; }
};

const orig = readFileSync(CON);
const origSha = sha(orig);
const s = orig.toString('utf8');

console.log('=== 原始 ===');
console.log('  窗口起点（第一次出现 "9.15"）：', s.slice(0, s.indexOf('9.15')).split('\n').length, '行');
console.log('  窗口终点（第一次出现 "9.16"）：', s.slice(0, s.indexOf('9.16')).split('\n').length, '行');

/* 在 §6 表格（L111 之前）插一行 `shadow` 假登记 */
const anchor = '| **不得横向溢出** |';
const injected = s.replace(anchor, '| `shadow` | 探针：证明 §6 表格的行会被 import 进允许表 | 见 §9.3 |\n' + anchor);
if (injected === s) throw new Error('插桩失败');
writeFileSync(CON, injected, 'utf8');

const r = run();
console.log('\n=== 插入 `shadow` 假登记后 ===');
console.log('  exit=' + r.code);
r.out.split(/\r?\n/).filter((l) => /允许表\(|C1 FAIL|C2 允许|C3 登记|合计/.test(l)).forEach((l) => console.log('  ' + l));
console.log('  → 允许表从 5 变 ' + (/允许表\((\d+) 条\)/.exec(r.out) || [])[1] + '，且全部"在引擎里"（shadow 确实是真规则）');
console.log('  → 从此 S13 若真出 shadow FAIL，C1 会判它"在允许表内"而放行');

/* 同时验证：C3 的 INFO 文案在这种情况下会怎么误导 */
const c3 = /没有任何案触发: ([^（]+)/.exec(r.out);
console.log('  → C3 文案：' + (c3 ? c3[1].trim() : '(无)') + '  ← 多出来的 shadow 被写成"已登记但无案触发"');

/* 还原 */
writeFileSync(CON, orig);
console.log('\n还原: sha 相同 =', sha(readFileSync(CON)) === origSha);

/* ===== 顺带验证 --json / --quiet ===== */
console.log('\n=== --json ===');
const j = run(' --json');
console.log('  exit=' + j.code + ' 可解析=' + (() => { try { JSON.parse(j.out); return true; } catch { return false; } })());
const parsed = JSON.parse(j.out);
console.log('  stats=' + JSON.stringify(parsed.stats));
console.log('  findings 条数=' + parsed.findings.length + '，levels=' + [...new Set(parsed.findings.map((f) => f.level))].join(','));

console.log('\n=== --quiet ===');
const q = run(' --quiet');
console.log('  exit=' + q.code);
console.log(q.out.split(/\r?\n/).map((l) => '  ' + l).join('\n'));

mkdirSync(`${ROOT}/deliverables/73-verify/_bk`, { recursive: true });
writeFileSync(`${ROOT}/deliverables/73-verify/_bk/probe2.txt`, r.out, 'utf8');
