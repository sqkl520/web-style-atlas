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
  { id: '_discriminator-check', args: ['--selftest'], label: '自测：判别值定义与命中判定', fail: true },
  { id: '_report-numbers-audit', label: '报告数字审计（48 份）', fail: true },
  /* 数字审计有六个独立检查，每个都用一条变异证明它会响。
   * 只测其中一条的话，其余五个仍然是「从没被证明会响」的状态。 */
  { id: '_report-numbers-audit', args: ['--selftest'], env: { SELECT_MUT: 'number' }, label: '自测：数字/行数断言', fail: true },
  { id: '_report-numbers-audit', args: ['--selftest'], env: { SELECT_MUT: 'caliber' }, label: '自测：案数口径解释', fail: true },
  { id: '_report-numbers-audit', args: ['--selftest'], env: { SELECT_MUT: 'handoff' }, label: '自测：交接表存在性', fail: true },
  { id: '_report-numbers-audit', args: ['--selftest'], env: { SELECT_MUT: 'staged' }, label: '自测：_staged 产物集合', fail: true },
  { id: '_report-numbers-audit', args: ['--selftest'], env: { SELECT_MUT: 'casenum' }, label: '自测：案数是否等于实测', fail: true },
  { id: '_report-numbers-audit', args: ['--selftest'], env: { SELECT_MUT: 'commit' }, label: '自测：commit 引用真实性', fail: true },
  { id: '_report-numbers-audit', args: ['--selftest'], env: { SELECT_MUT: 'caliberDrift' }, label: '自测：多份实现口径一致', fail: true },
  { id: '_revoked-claims', label: '作废声明检查', fail: true },
  { id: '_revoked-claims', args: ['--selftest'], label: '自测：作废声明检查', fail: true },
  { id: '_fact-index', label: '事实反向索引（只列不断言）', fail: false },
  /* ⚠️ 2026-11-21 新增：评分器盲区。
   * 上面十几项检查的都是"研究报告说得对不对"，没有一项检查
   * **北极星指标的尺子本身**。而实测它当时对 26/35 案从未判过，
   * 报告却读作"四案五类全过"。
   * 这一项不判分（fail: false）—— 它报的是覆盖率的清单，
   * 覆盖率低不等于错。但它必须每次都被打印出来。
   * 加 `--id` 跑：node _scorer-blindspot.mjs */
  { id: '../_blindtest/score', args: ['--selftest'], label: '自测：盲测评分器判据', fail: true },
  /* 2026-11-21 新增：正对照。
   * 拿 35 个**原型**（手工做的、已知合格）当产物跑一遍判据。
   * 判据如果判它们违规，那是判据错了 —— 不是原型错了。
   * 本仓库已经两次因为"判据把对的判成错的"而差点改坏正确的东西
   * （§十三 gradient 误判、§二十七 字体锚点连错三次），两次都靠人肉回查。
   * 这一项把"判据会不会冤枉合格样品"变成可自动跑的检查。 */
  { id: '../_blindtest/score', args: ['--positive-control'], label: '正对照：35 个原型不被判违规', fail: true },
  { id: '_scorer-blindspot', label: '评分器覆盖率（不判分，只报）', fail: false },
  /* 2026-11-21 新增：动效段的效果对照。
   * 补上 motion 之后，"补对了没有"不能靠读提示词确认 —— 那只能证明文本变了。
   * 这一项比较 S34 两轮产物（有/无动效段），断言动效结构真的出现了。 */
  { id: '_motion-effect', label: '动效段是否到达产物（S34 两轮对照）', fail: true },
  /* 2026-11-21 新增：机制保真度。
   * `score.mjs` 的五类判据里**没有一类查机制** —— 所以它报"五类全过"时，
   * 风格可能对、机制却不在（实测 S13 两份产物五类全过，机制 5/8 vs 8/8）。
   * 这一项按 check-prompts 已有的三态（hit/script/comment/absent）判，
   * 只报不判：阈值取决于每个案机制句自己写了多少。 */
  { id: '_mech-fidelity', label: '机制保真度（只报不判）', fail: false },
];

const results = [];
const t0 = Date.now();

/* ── 崩溃 vs 断言失败 ──────────────────────────────────────────────
 * 这两件事的处置完全不同：
 *   断言失败 = 脚本认为某条判据不成立 → 去看报告/数据哪里错了
 *   脚本崩溃 = 脚本自己坏了 → 去看脚本，判据根本没被执行
 *
 * 不加区分时的后果我实测过两次（写 caliberDrift 变异时）：
 *   · 副本路径指错 → 输出 0/0 → 退出码非零 → 我读成「检测到漂移」
 *   · 实际是 MODULE_NOT_FOUND，判据一次都没跑
 * 「因为崩了而红」和「因为真的有问题而红」在 exit code 上完全一样。
 *
 * 判据：输出里出现未捕获异常的痕迹，或者退出码是 -1（信号杀掉），
 * 就归为崩溃，单独标注并单独计数。 */
const CRASH_PATTERNS = [
  /^\s*at\s+\S+\s+\(/m,                  // 堆栈帧
  /Error:.*\n\s+at /,                    // 带堆栈的 Error
  /Cannot find module/,
  /SyntaxError/,
  /ReferenceError/,
  /TypeError/,
  /ERR_[A-Z_]+/,
];
function detectCrash(code, out) {
  if (code === -1) return '进程被信号杀掉（超时或外部 kill）';
  if (code === 0) return null;
  for (const re of CRASH_PATTERNS) {
    if (re.test(out)) return '脚本抛出未捕获异常（判据未执行）';
  }
  return null;
}

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
  const crash = detectCrash(code, out);
  results.push({ ...s, code, ms, tail, out, crash });
  /* 三种标记：✓ 通过　✗ 断言失败　💥 脚本崩溃 */
  const mark = code === 0 ? '✓' : (crash ? '💥' : (s.fail ? '✗' : '·'));
  if (!QUIET || code !== 0) {
    console.log(`${mark} ${s.label.padEnd(36)} ${(ms / 1000).toFixed(1)}s`);
    if (crash) console.log(`    ⚠️ ${crash} —— 这不是判据失败，是脚本本身坏了`);
    for (const t of tail) console.log(`    ${t.trim().slice(0, 100)}`);
  }
}

const failed = results.filter((r) => r.fail && r.code !== 0);
const crashed = failed.filter((r) => r.crash);
const asserted = failed.filter((r) => !r.crash);
const totalMs = Date.now() - t0;

console.log('');
console.log('─'.repeat(70));
if (failed.length === 0) {
  console.log(`结论：${STEPS.filter((s) => s.fail).length} 项断言全部通过（${(totalMs / 1000).toFixed(1)}s）`);
  console.log('');
  console.log('这些脚本都不碰 claude、不花钱。改任何报告之后跑一次。');
} else {
  /* 崩溃和断言失败分开报 —— 处置完全不同。 */
  console.log(`结论：${failed.length} 项未通过` +
    (crashed.length ? `（其中 ${crashed.length} 项是脚本崩溃，${asserted.length} 项是断言失败）` : ''));

  if (crashed.length) {
    console.log('');
    console.log('💥 脚本崩溃 —— 先修脚本，这些判据根本没被执行：');
    for (const f of crashed) console.log(`  · ${f.label}：${f.crash}`);
  }
  if (asserted.length) {
    console.log('');
    console.log('✗ 断言失败 —— 脚本跑通了但认为判据不成立：');
    for (const f of asserted) console.log(`  · ${f.label}`);
  }

  for (const f of failed) {
    console.log('');
    console.log(`── ${f.label} ──`);
    /* 失败时把完整输出打出来 —— 摘要不够定位 */
    console.log(f.out.trim());
  }
  console.log('');
  console.log('单独重跑：');
  for (const f of failed) {
    console.log(`  node deliverables/78-northstar/_probe/${f.id}.mjs ${(f.args || []).join(' ')}`);
  }
}

process.exit(failed.length === 0 ? 0 : 1);
