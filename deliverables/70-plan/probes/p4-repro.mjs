/**
 * p4-repro.mjs —— 生成链可复现性检查：跑一遍 extract → clean → build，比对 HEAD 里的三个 tracked 产物。
 *
 * 为什么这必须是一个探针、而不是"顺手跑一下"：
 *   本仓库的规矩是「所有声称必须能被一条命令重跑验证」。而"提示词数据是从 CSS 实测抽出来的"
 *   这个声称，成立的前提是**重跑一遍能得到同样的字节**。如果重跑会改写 tracked 文件，
 *   那么下一个人跑完就会看到 `git status` 变脏 —— 他要么以为是自己弄坏的，
 *   要么把一批来路不明的改动一起提交。两种都是灾难。
 *
 * 本探针只读：它把三个产物算成 blob hash 与 HEAD 比对，然后 **git checkout 恢复**。
 * 不 commit、不 stash、不留痕。末尾会断言工作区已恢复干净。
 *
 * 用法：node deliverables/70-plan/probes/p4-repro.mjs
 * 退出码：0 = 三个产物全部可复现；1 = 有产物不可复现（会打印差异摘要）
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const ARTIFACTS = [
  { path: 'prototypes/_prompts/dna-raw.json', gen: 'prototypes/_prompts/extract-dna.mjs' },
  { path: 'prototypes/_prompts/dna-clean.json', gen: 'prototypes/_prompts/clean-dna.mjs' },
  { path: 'prototypes/_selection/prompts.js', gen: 'prototypes/_prompts/build-prompts.mjs' },
];

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
const blob = (p) => git('hash-object', p);
const headBlob = (p) => git('rev-parse', 'HEAD:' + p);

console.log('=== 开工基线 ===');
const HEAD = git('rev-parse', 'HEAD');
console.log('HEAD            =', HEAD);
const dirtyBefore = git('status', '--porcelain', '--', 'prototypes/');
console.log('工作区(prototypes) =', dirtyBefore ? dirtyBefore.split('\n').length + ' 项已改' : '干净');
if (dirtyBefore) {
  console.error('\n⚠ prototypes/ 已有未提交改动，本探针无法区分"我跑出来的"与"本来就在的"。');
  console.error('请先处理干净再跑：\n' + dirtyBefore);
  process.exit(2);
}

/* 逐级生成（顺序不能反：clean 读 raw，build 读 clean） */
for (const a of ARTIFACTS) {
  if (!existsSync(join(ROOT, a.gen))) throw new Error('缺生成器 ' + a.gen);
  process.stdout.write(`生成 ${a.path} ← ${a.gen} ... `);
  execFileSync(process.execPath, [a.gen], { cwd: ROOT, stdio: 'ignore' });
  console.log('ok');
}

console.log('\n=== 可复现性比对 ===');
const rows = [];
for (const a of ARTIFACTS) {
  const got = blob(a.path), want = headBlob(a.path);
  rows.push({ path: a.path, got, want, same: got === want });
  console.log(`${a.path}\n  HEAD ${want}\n  重跑 ${got}\n  → ${got === want ? '一致 ✅' : '不一致 ❌'}`);
}

/* 不可复现时给出**语义**差异，而不只是 hash：hash 变了但值没变等于噪声 */
const semantic = [];
for (const r of rows.filter(x => !x.same)) {
  const now = JSON.parse(readFileSync(join(ROOT, r.path), 'utf8').replace(/^\uFEFF/, '')
    .replace(/^window\.STYLE_PROMPTS\s*=\s*/, '').replace(/;\s*$/, ''));
  const old = JSON.parse(git('show', 'HEAD:' + r.path).replace(/^\uFEFF/, '')
    .replace(/^window\.STYLE_PROMPTS\s*=\s*/, '').replace(/;\s*$/, ''));
  const diffs = [];
  const walk = (a, b, path) => {
    if (a === b) return;
    if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') {
      diffs.push({ path, head: a, now: b }); return;
    }
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) walk(a[k], b[k], path + '.' + k);
  };
  walk(old, now, '$');
  semantic.push({ path: r.path, n: diffs.length, diffs: diffs.slice(0, 25) });
}

if (semantic.length) {
  console.log('\n=== 语义差异（hash 之外，值到底变在哪）===');
  for (const s of semantic) {
    console.log(`\n${s.path}：${s.n} 处值差异${s.n > 25 ? '（只列前 25）' : ''}`);
    for (const d of s.diffs) console.log(`  ${d.path}\n    HEAD: ${JSON.stringify(d.head)}\n    重跑: ${JSON.stringify(d.now)}`);
  }
}

/* 恢复：三个产物一律回到 HEAD 状态 */
for (const a of ARTIFACTS) execFileSync('git', ['checkout', '--', a.path], { cwd: ROOT, stdio: 'ignore' });

console.log('\n=== 收尾基线 ===');
const dirtyAfter = git('status', '--porcelain', '--', 'prototypes/');
console.log('HEAD            =', git('rev-parse', 'HEAD'));
console.log('工作区(prototypes) =', dirtyAfter ? '⚠ 仍有改动\n' + dirtyAfter : '已恢复干净 ✅');

const bad = rows.filter(r => !r.same);
mkdirSync(HERE, { recursive: true });
writeFileSync(join(HERE, 'p4-repro.json'), JSON.stringify({
  generatedAt: new Date().toISOString(), head: HEAD, artifacts: rows, semantic,
}, null, 1), 'utf8');

console.log(`\n结论：${ARTIFACTS.length - bad.length}/${ARTIFACTS.length} 个产物可复现。`);
if (bad.length) {
  console.log('不可复现的：' + bad.map(b => b.path).join(', '));
  console.log('→ 说明生成器在产物最后一次落盘之后被改过，且没有人重跑。');
}
process.exit(bad.length ? 1 : 0);
