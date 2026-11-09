#!/usr/bin/env node
/* 陈旧度闸门（commit 判据）—— 给 CI 用，开发机仍用 check-stale.mjs（mtime 判据）。
 *
 * 为什么要两份
 * ────────────
 * `check-stale.mjs` 问的是「源的 mtime 是否晚于 report.json 内嵌的 `at`」。
 * 这个问题在开发机上有意义（mtime 记录了「我最后一次碰它是什么时候」），
 * 在 CI 上则**必然全假**：`git checkout` 把每个文件的 mtime 都刷成检出时刻，
 * 而 `at` 是几个星期前渲染那一刻的墙钟时间 ⇒ 每一案都「陈旧」。
 *
 * 实测（2026-11-04，干净 clone `git clone file:///D:/Web/style`）：
 *     ⚠️ 31 项陈旧 … 31/31 全假
 * 连「检出后从 git 恢复 mtime」也救不了 —— 恢复出来的是源的**最后一个 commit 时间**，
 * 而判据比的是 `report.json` 内嵌的 `at`，两者本来就不是一个坐标系。
 * 实测恢复 2251 个文件的 mtime（8.8 s）之后，仍然 11+ 项陈旧。
 *
 * 所以 CI 换一个**在这个环境里有意义**的问题：
 *     这一案的源文件，最后一次被 commit，是否晚于它的 report.json 最后一次被 commit？
 *
 * 判据成立的理由：一次正常的「改源 → 重渲染 → 提交」会同时改 report.json 和截图，
 * 于是两者的最后一个 commit 相同 ⇒ 不陈旧。只有「改了源、没重渲就提交」才会让
 * 源的 commit 更新。这正是 AH-11 / AH-14 / N1 三次事故的共同形状。
 *
 * ⚠️⚠️ 前提：必须是完整历史（`actions/checkout` 的 `fetch-depth: 0`）
 * ────────────────────────────────────────────────────────────────────
 * depth-1 的 clone 里 `git log` 只有 1 个 commit，所有文件都属于同一个 commit，
 * 「源比报告新」永远不成立 ⇒ 本脚本会安静地返回「0 陈旧」，看起来像通过。
 * 这是本仓库最恨的那类失效：**失效的样子是绿**。
 * （实测：depth-1 + 改 style.css 并 amend 进同一个 commit → stale: 0。）
 *
 * 所以下面第一步就是自检历史完整性，不完整直接 exit 2，
 * **绝不**在无法判定时返回「0 陈旧」。
 *
 * 用法：
 *   node prototypes/_build/check-stale-git.mjs [--quiet] [--json]
 *   退出码：0 = 全部新鲜；1 = 有陈旧项；2 = 环境不满足（历史不完整 / 不是 git 仓库）
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const P = join(ROOT, 'prototypes');
const QUIET = process.argv.includes('--quiet');
const JSON_OUT = process.argv.includes('--json');

/* git 可执行文件的解析。
 * ⚠️ 在本机（Windows + git-bash）直接 spawn('git') 会 ENOENT：
 *    bash 里的 `git` 是 /mingw64/bin/git，不在 Node 的 PATH 解析范围内。
 *    实测 `execFileSync('git', …)` → spawnSync git ENOENT。
 * 所以先试 `git`，失败再试 git-bash 常见路径；CI（ubuntu）上第一个就成功。 */
function gitBin() {
  const cands = [
    process.env.GIT_BIN,
    'git',
    'D:/Git/mingw64/bin/git.exe',
    'C:/Program Files/Git/mingw64/bin/git.exe',
    'C:/Program Files/Git/bin/git.exe',
  ].filter(Boolean);
  for (const c of cands) {
    try { execFileSync(c, ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); return c; }
    catch { /* 试下一个 */ }
  }
  return null;
}

const GIT = gitBin();
function die(msg, code = 2) {
  console.error('陈旧度闸门（commit 判据）无法判定：' + msg);
  console.error('  ⚠️  这不等于「全部新鲜」。按契约「空集是子集」那类缺陷的处置：判不了就报错，不报绿。');
  process.exit(code);
}

if (!GIT) die('找不到 git 可执行文件');
const git = (...a) => execFileSync(GIT, a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });

/* ── 前置自检①：这是一个 git 仓库 ─────────────────────────────────────── */
try { git('rev-parse', '--git-dir'); }
catch { die('不在 git 仓库里（或 .git 不可读）'); }

/* ── 前置自检②：历史必须完整 ────────────────────────────────────────────
 * 这是本脚本唯一真正危险的地方。depth-1 会让判据恒真（= 永远绿），
 * 而不是恒假。所以宁可不跑。 */
let commits = 0;
try { commits = Number(git('rev-list', '--count', 'HEAD').trim()); }
catch { die('读不出 HEAD 的历史（可能是空仓库）'); }

let shallow = false;
try { shallow = git('rev-parse', '--is-shallow-repository').trim() === 'true'; }
catch { /* 老版本 git 没这个命令，退回看 .git/shallow */ shallow = existsSync(join(ROOT, '.git', 'shallow')); }

if (shallow || commits <= 1) {
  die(`历史不完整（shallow=${shallow}，commit 数=${commits}）。
  完整历史是本判据成立的前提：depth-1 的 clone 里所有文件同属一个 commit，
  「源比报告新」永远不成立 ⇒ 本脚本会假绿。
  修法：checkout 时用 fetch-depth: 0（或 git fetch --unshallow 后重跑）。`);
}

/* ── 一次 `git log` 拿到「每个文件最后一次被哪个 commit 碰过」 ─────────────
 * 一次全量扫描 95 个 commit / 2251 个文件实测 4.5 s；
 * 逐文件 `git log -1 -- <path>` 是 3 s/文件 × 31 × 若干源文件 ≈ 数分钟，不用。
 * `--no-renames` 很重要：否则重命名会让旧路径凭空消失，判据漏掉那些文件。 */
const logOut = git('log', '--format=%x01%H %ct', '--name-only', '--no-renames');
const lastTouch = new Map();   // path -> commit 序号（**越小越新**：0 是最旧，N-1 是 HEAD）
let seq = -1;
for (const line of logOut.split('\n')) {
  if (line.startsWith('\x01')) { seq++; continue; }
  const p = line.trim();
  if (p && !lastTouch.has(p)) lastTouch.set(p, seq);   // 从新到旧遍历，首见即最后一次
}
/* ⚠️ 序号方向很容易写反，这里写死一次说清楚：
 *   `git log` 默认**从新到旧**输出 ⇒ 第一个 commit 的 seq 最小（= 0）…
 *   最后一个 commit（最旧）的 seq 最大。
 *   所以 `seq` 越小 = 越新。
 *   「源比报告新」= 源的 seq **小于** report.json 的 seq。
 *   2026-11-04 我第一版写成 `>`（等于问「源比报告旧」），
 *   在 HEAD 上报出 17 项「陈旧」—— 而那 17 项恰好是**最健康**的那些
 *   （报告在源之后重渲过）。判据的方向写反会把绿灯全变成红灯，
 *   与「空集恒真」是同一个家族的错误：错在坐标，不在数据。 */
const TOTAL = seq + 1;

/* ── 目录清单：唯一来源是 `_entries.mjs`，不在这里再写一遍 ────────────────
 * 2026-10-28 的教训：`_selection` 被三份脚本各自漏掉，于是它的报告陈旧 5.94 天
 * 而「检查」一路报绿。新增入口只改 `_entries.mjs`。 */
const { caseDirs, productEntries } = await import('./_entries.mjs');

const targets = [];
for (const name of caseDirs(P)) {
  targets.push({ id: name.slice(0, 3), dir: name, label: null, sources: ['index.html', 'style.css'] });
}
for (const e of productEntries(P)) {
  targets.push({ id: e.dir, dir: e.dir, label: e.label, sources: e.sources });
}

const stale = [];
let checked = 0;
for (const t of targets) {
  const rep = `prototypes/${t.dir}/.inspect/report.json`;
  /* 没有报告 ≠ 陈旧：那是「从未渲染过」，该由别的检查报（与 check-stale.mjs 同口径）。 */
  const repSeq = lastTouch.get(rep);
  if (repSeq === undefined) continue;
  checked++;

  /* 找「最后一个 commit 比 report.json 更晚」的源文件。
   * 序号越小越新（0 = 最新）⇒ 源的 seq **小于** 报告的 seq = 源比报告新 = 陈旧。 */
  let worst = null;
  for (const s of t.sources) {
    const f = `prototypes/${t.dir}/${s}`;
    const s2 = lastTouch.get(f);
    if (s2 === undefined) continue;              // 源文件不存在就不判它
    if (s2 < repSeq && (!worst || s2 < worst.seq)) worst = { file: s, seq: s2 };
  }
  /* 落后多少个 commit：报告那次提交之后，源又被碰了几次。
   * 序号越小越新 ⇒ 差值取 `repSeq - worst.seq` 才是正数。 */
  if (worst) stale.push({ ...t, which: worst.file, behindCommits: repSeq - worst.seq });
}

/* ── 输出 ──────────────────────────────────────────────────────────────── */
if (JSON_OUT) {
  console.log(JSON.stringify({ checked, commits, stale: stale.map((s) => ({ id: s.id, dir: s.dir, which: s.which, behindCommits: s.behindCommits })) }, null, 1));
  process.exit(stale.length ? 1 : 0);
}

if (!QUIET) {
  console.log(`闸门陈旧度（commit 判据）：检查 ${checked} 个入口 / 历史 ${commits} 个 commit`);
  console.log('  判据：源的最后一个 commit 是否晚于 .inspect/report.json 的最后一个 commit');
  console.log('  （开发机的 mtime 判据见 check-stale.mjs；CI 上 mtime 必然假阳性，见本文件头注释）');
}

if (stale.length) {
  console.log(`  ⚠️ ${stale.length} 项陈旧（改了源、没重渲就提交）：`);
  for (const s of stale) {
    const name = s.label ? `${s.label}(${s.dir})` : s.id;
    const cmd = s.label ? `（见 _entries.mjs 的 render 字段）` : `node prototypes/_build/render-scheme.mjs ${s.dir}`;
    console.log(`     ${name}  ${s.which}  落后 ${s.behindCommits} 个 commit  →  ${cmd}`);
  }
  console.log('  陈旧的后果：选型台与 data.js 展示的是**旧修订**的闸门结果与截图。');
  process.exit(1);
}

if (!QUIET) console.log('  ✓ 全部新鲜');
process.exit(0);
