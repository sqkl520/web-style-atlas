#!/usr/bin/env node
/* 研究线体检：盲测证据 + 报告一致性。
 *
 * 为什么不并进 `prototypes/_build/quarter.mjs`：
 * 那个是**产品链**的季度体检（规格 → DNA → 提示词 → 九道闸门）。
 * 这里的五个脚本是**研究线**的证据链（盲测产物、判别值、报告数字）。
 *
 * 混在一起的后果是耦合：有人清理 `_probe/_staged/` 里的研究产物，
 * 产品体检就会红 —— 而那是一个没人能理解的失败。
 * 两条线各有各的入口，各自红各自的。
 *
 * ═══ 用法 ═══════════════════════════════════════════════════════════
 *
 *   node deliverables/78-northstar/_probe/verify-research.mjs
 *   node deliverables/78-northstar/_probe/verify-research.mjs --quiet   # 只报失败
 *
 * 退出码 0 = 全部通过；1 = 有失败（可直接接进提交前检查）。
 *
 * ═══ 它跑什么 ═══════════════════════════════════════════════════════
 *
 *   1. _evidence-gate         六条断言：判别值 67/67、阴性对照、干净值、hex 数、案数
 *   2. _discriminator-check   逐案判别值明细（同时是 1 的数据来源）
 *   3. _report-numbers-audit  48 份报告里的数字 / 行数 / 字节数 / commit 引用
 *   4. _revoked-claims        主报告里有没有「已被别处判作废但还在引用」的表述
 *   5. _fact-index            被多份报告共同引用的数字（只列，不断言）
 *
 * 前四个有 pass/fail；第五个是索引，永远 exit 0。
 */
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const QUIET = process.argv.includes('--quiet');

const STEPS = [
  /* ⚠️ id 必须和实际文件名完全一致（含开头的下划线）。
   * 第一版写成 'evidence-gate' 漏了下划线，报 MODULE_NOT_FOUND ——
   * 而它恰好是唯一带下划线的那个，这说明「凭记忆写文件名」不可靠。 */
  { id: '_evidence-gate', label: '证据闸门（六条断言）', fail: true },
  { id: '_evidence-gate', args: ['--selftest'], label: '自测：证据闸门', fail: true },
  { id: '_discriminator-check', label: '判别值逐案明细', fail: true },
  { id: '_report-numbers-audit', label: '报告数字审计（48 份）', fail: true },
  /* 数字审计有六个独立检查，每个都用一条变异证明它会响。
   * 只测其中一条的话，其余五个仍然是「从没被证明会响」的状态。 */
  { id: '_report-numbers-audit', args: ['--selftest'], env: { SELECT_MUT: 'number' }, label: '自测：数字/行数断言', fail: true },
  { id: '_report-numbers-audit', args: ['--selftest'], env: { SELECT_MUT: 'caliber' }, label: '自测：案数口径解释', fail: true },
  { id: '_report-numbers-audit', args: ['--selftest'], env: { SELECT_MUT: 'handoff' }, label: '自测：交接表存在性', fail: true },
  { id: '_report-numbers-audit', args: ['--selftest'], env: { SELECT_MUT: 'commit' }, label: '自测：commit 引用真实性', fail: true },
  { id: '_revoked-claims', label: '作废声明检查', fail: true },
  { id: '_revoked-claims', args: ['--selftest'], label: '自测：作废声明检查', fail: true },
  { id: '_fact-index', label: '事实反向索引（只列不断言）', fail: false },
];

const results = [];
const t0 = Date.now();

for (const s of STEPS) {
  const file = join(HERE, `${s.id}.mjs`);
  const started = Date.now();
  let out = '', code = 0;
  try {
    out = execFileSync(process.execPath, [file, ...(s.args || [])], {
      cwd: resolve(HERE, '../../..'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5 * 60 * 1000,
      env: { ...process.env, ...(s.env || {}) },
    });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
    code = e.status == null ? -1 : e.status;
  }
  const ms = Date.now() - started;
  /* 只取最后几行做摘要 —— 中间过程在这个汇总层没有价值，
   * 要看细节目录里单独跑那个脚本。 */
  const lines = out.trim().split('\n').filter(Boolean);
  const tail = lines.slice(-3);
  results.push({ ...s, code, ms, tail, out });
  const mark = code === 0 ? '✓' : (s.fail ? '✗' : '·');
  if (!QUIET || code !== 0) {
    console.log(`${mark} ${s.label.padEnd(36)} ${(ms / 1000).toFixed(1)}s`);
    for (const t of tail) console.log(`    ${t.trim().slice(0, 100)}`);
  }
}

const failed = results.filter((r) => r.fail && r.code !== 0);
const totalMs = Date.now() - t0;

console.log('');
console.log('─'.repeat(70));
if (failed.length === 0) {
  console.log(`结论：${STEPS.filter((s) => s.fail).length} 项断言全部通过（${(totalMs / 1000).toFixed(1)}s）`);
  console.log('');
  console.log('这些脚本都不碰 claude、不花钱。改任何报告之后跑一次。');
} else {
  console.log(`结论：${failed.length} 项失败`);
  for (const f of failed) {
    console.log('');
    console.log(`── ${f.label} ──`);
    /* 失败时把完整输出打出来 —— 摘要不够定位 */
    console.log(f.out.trim());
  }
  console.log('');
  console.log('单独重跑：');
  for (const f of failed) console.log(`  node deliverables/78-northstar/_probe/${f.id}.mjs`);
}

process.exit(failed.length === 0 ? 0 : 1);
