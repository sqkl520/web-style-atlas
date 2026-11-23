/* 判据改动的前后对比：同一个 commit 的评分器 vs 工作区版，跑同一批产物，diff 结论。
 *
 * 为什么需要这个：
 * 这一轮改过判据很多次，每次只跑改后那一次 —— 于是只知道「现在有多少违规」，
 * 不知道「这个数是变来的还是本来就在」。
 * 具体吃过两次亏：
 *   · 给 judgeFontChain 补上展开 CSS 变量 → 正对照立刻红（S34 链外×5），
 *     当时不确定这是「新发现的真问题」还是「判据变严」。逐个查才知道是前者。
 *   · 如果不查，最可能的处置是把张规则放宽或者加豁免 —— 那就把真缺陷盖掉了。
 *
 * 用法：
 *   node _scorer-diff.mjs <改前的commit>
 *   node _scorer-diff.mjs 7eba54a
 *
 * 它做三件事：
 *   1. 用 git show 取出改前那版评分器，临时替换
 *   2. 跑 --all，抓每案的判据行
 *   3. 换回工作区版，再跑一遍，逐案对比
 *
 * 注意：它会真的替换 score.mjs，所以**必须在工作区干净时跑**，
 * 且跑完会校验恢复成功（md5 比对），失败就报错而不是静默留下旧文件。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const BT = join(REPO, 'deliverables/78-northstar/_blindtest');
const SCORE = join(BT, 'score.mjs');

const before = process.argv[2];
if (!before) {
  console.error('用法：node _scorer-diff.mjs <改前的commit>');
  process.exit(1);
}

const md5 = (s) => createHash('md5').update(s).digest('hex');

/* ── 前置：工作区必须是干净的 ────────────────────────────────────────
 * 不干净的话，下面「换回工作区版」这一步可能把用户未提交的改动冲掉。
 * 这不是防御性编程，是实测出来的风险：本仓库的开发流程里 score.mjs 经常是脏的。 */
const dirty = execFileSync('git', ['status', '--porcelain', '--', 'deliverables/78-northstar/_blindtest/score.mjs'], { cwd: REPO, encoding: 'utf8' }).trim();
if (dirty) {
  console.error('✗ score.mjs 有未提交改动，先提交或 stash 再跑（否则恢复步骤会冲突）');
  console.error('  ' + dirty);
  process.exit(1);
}

const currentSrc = readFileSync(SCORE, 'utf8');
const currentMd5 = md5(currentSrc);

let beforeSrc;
try {
  beforeSrc = execFileSync('git', ['show', `${before}:deliverables/78-northstar/_blindtest/score.mjs`], { cwd: REPO, encoding: 'utf8' });
} catch {
  console.error(`✗ 取不到 ${before} 版的 score.mjs —— commit 写错了，或者那时文件路径不同`);
  process.exit(1);
}

/* ── 跑一次 --all，抓判据行 ───────────────────────────────────────── */
function runAll(label) {
  let out;
  try {
    out = execFileSync('node', [SCORE, '--all'], { cwd: REPO, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
  }
  const rows = new Map();
  let cur = null;
  for (const line of out.split('\n')) {
    const m = line.match(/^══ (S\d{2}(?:-r\d+)?)\s/);
    if (m) { cur = m[1]; rows.set(cur, []); continue; }
    if (cur && /^\s+(①|②|③|④|⑤|     线宽|     字号|     图片|     底色)/.test(line)) {
      rows.get(cur).push(line.trim());
    }
  }
  if (!rows.size) {
    console.error(`✗ ${label} 这一次一个案都没抓到 —— 评分器跑挂了，先修它`);
    process.exit(1);
  }
  return rows;
}

console.log(`改前：${before}`);
writeFileSync(SCORE, beforeSrc, 'utf8');
const R0 = runAll('改前');

/* 恢复必须校验 —— 如果这一步静默失败，仓库里就留着旧版评分器，
 * 而下次任何人跑 --all 都会得到过时的结论，且没有任何提示。 */
writeFileSync(SCORE, currentSrc, 'utf8');
if (md5(readFileSync(SCORE, 'utf8')) !== currentMd5) {
  console.error('✗ 恢复 score.mjs 失败！文件内容与跑之前不一致，先手工检查');
  process.exit(1);
}
const R1 = runAll('改后');

/* ── 对比 ─────────────────────────────────────────────────────────── */
const ids = [...new Set([...R0.keys(), ...R1.keys()])].sort();
let changed = 0;
const detail = [];

for (const id of ids) {
  const a = (R0.get(id) || []).join('\n');
  const b = (R1.get(id) || []).join('\n');
  if (a === b) continue;
  changed++;
  const la = R0.get(id) || [], lb = R1.get(id) || [];
  const diffs = [];
  const n = Math.max(la.length, lb.length);
  for (let i = 0; i < n; i++) {
    if ((la[i] || '') !== (lb[i] || '')) diffs.push({ before: la[i] || '（无）', after: lb[i] || '（无）' });
  }
  detail.push({ id, diffs });
}

console.log(`\n共 ${ids.length} 案，其中 ${changed} 案的结论有变化\n`);
for (const { id, diffs } of detail) {
  console.log(`══ ${id}`);
  for (const d of diffs) {
    console.log(`   改前  ${d.before}`);
    console.log(`   改后  ${d.after}`);
  }
  console.log('');
}

/* ── 一个必答的问题 ─────────────────────────────────────────────────
 * 如果改后违规变多，那不是「改坏了」也不是「改好了」，而是一个待分类的现象：
 * 要么是新发现的真问题，要么是判据变严的误报。这个脚本判不了，只能提示。 */
const countViolation = (rows) => {
  let n = 0;
  for (const lines of rows.values()) for (const l of lines) if (/✗/.test(l)) n++;
  return n;
};
const v0 = countViolation(R0), v1 = countViolation(R1);
console.log('━━ 违规数 ━━');
console.log(`  改前 ${v0} 条 → 改后 ${v1} 条（${v1 > v0 ? '增加 ' + (v1 - v0) : v1 < v0 ? '减少 ' + (v0 - v1) : '不变'}）`);
if (v1 > v0) {
  console.log('');
  console.log('  ⚠️ 违规变多。这**不等于**改坏了，也不等于改好了。逐条分类：');
  console.log('     · 新发现的真问题 → 留着，去修产品');
  console.log('     · 判据变严造成的误报 → 修判据');
  console.log('     分不清的，用正对照（--positive-control）判：原型被判违规就是误报。');
}
if (v1 === v0 && changed === 0) {
  console.log('  · 一字未变 —— 这个改动对现有产物没有任何影响（可能是只改了注释）');
}
