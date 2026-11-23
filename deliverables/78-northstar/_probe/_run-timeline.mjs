/* 跑批日志的时段统计：把「什么时候能跑」变成一个可查的数字。
 *
 * 为什么需要这个脚本（而不是看报告里的表）：
 * 2026-11-23 的 23 次跑批里，凌晨 10/10 成功、深夜 3/11 成功。
 * 这个差异**比任何单案的差异都大**，而在此之前每次失败我都在想
 * 「是不是这个案有问题」。
 *
 * 判据（写死在这里，不事后改）：
 *   · 连续失败时先查同期的别的案 —— 别的案也挂就等窗口
 *   · 只有这个案挂，才去查那个案
 *
 * ⚠️ 数据来源是 **stdout 日志**，不是磁盘目录。
 * 磁盘目录算出来的成功率会偏高（失败的目录常被清理），
 * 2026-11-23 实测：磁盘 100% vs 日志 61% —— 差了 39 个百分点。
 */

/* 数据来源优先级：
 *   ① 仓库内的 `_blindtest/_runs.jsonl`（2026-11-23 起 acp-run 自动追加）
 *      —— 不会被系统清理，是**权威来源**
 *   ② `%TEMP%` 里的 stdout 日志 —— 易失（实测 23 条十分钟内变 3 条），
 *      只用来补台账启用之前的历史
 *
 * 先读台账；台账为空才回落到日志扫描。两者都读会重复计数。 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LEDGER = resolve(HERE, '..', '_blindtest', '_runs.jsonl');
const runs = [];

function fromLedger() {
  if (!existsSync(LEDGER)) return 0;
  const lines = readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean);
  const starts = new Map();
  const ends = new Map();
  for (const l of lines) {
    let r;
    try { r = JSON.parse(l); } catch { continue; }   // 半行（写入被打断）
    /* 兼容两种格式：有 phase 的新格式，和只有 ok 的旧格式（这一轮早期写的）。 */
    if (r.phase === 'start') { starts.set(r.key, r); continue; }
    if (r.phase === 'end') { ends.set(r.key, r); continue; }
    if (typeof r.ok === 'boolean') {   // 旧格式
      const at = new Date(r.at).getTime();
      runs.push({ id: r.id, at, ok: !!r.ok, hour: new Date(at).getHours(), died: false });
    }
  }
  /* 有 end 的：正常收尾，成败看 ok
   * 只有 start 没有 end 的：**猝死** —— 以前完全拿不到的信息 */
  let died = 0;
  for (const [key, s] of starts) {
    const e = ends.get(key);
    const at = new Date(s.at).getTime();
    if (e) {
      runs.push({ id: s.id, at, ok: !!e.ok, hour: new Date(at).getHours(), died: false });
    } else {
      died++;
      runs.push({ id: s.id, at, ok: false, hour: new Date(at).getHours(), died: true });
    }
  }
  if (died) console.log(`  · 其中 ${died} 次是「有开始记录、无结束记录」的猝死`);
  return runs.length;
}

function fromLogs() {
  const CANDIDATES = [
    process.env.TEMP || '',
    process.env.TMP || '',
    '/tmp',
    'C:/Users/ADMINI~1/AppData/Local/Temp',
  ].filter(Boolean);
  let D = null, bestN = 0;
  for (const c of [...new Set(CANDIDATES)]) {
    try {
      const n = readdirSync(c).filter((f) => /^s\d+r\d+\w*\.log$/i.test(f)).length;
      if (n > bestN) { D = c; bestN = n; }
    } catch { /* 目录不存在 */ }
  }
  if (!D) return { n: 0, dir: null };
  const files = readdirSync(D)
    .filter((f) => /^s\d+r\d+\w*\.log$/i.test(f))
    .map((f) => ({ f, m: statSync(join(D, f)).mtimeMs }))
    .sort((a, b) => a.m - b.m);
  for (const { f, m } of files) {
    const t = readFileSync(join(D, f), 'utf8');
    if (!/提示词 \d+ 字/.test(t)) continue;
    const ok = /产物：从消息提取|产物：agent 自己写的文件/.test(t);
    runs.push({ id: f.replace(/\.log$/, ''), at: m, ok, hour: new Date(m).getHours() });
  }
  return { n: runs.length, dir: D, files: bestN };
}

const ledgerN = fromLedger();
let logInfo = { n: 0, dir: null, files: 0 };
if (ledgerN) {
  console.log(`（数据来源：仓库台账 _runs.jsonl，${ledgerN} 条 —— 权威来源，不会被系统清理）`);
} else {
  logInfo = fromLogs();
  if (logInfo.files) {
    console.log(`（数据来源：%TEMP% 日志 ${logInfo.dir}，找到 ${logInfo.files} 个文件）`);
    console.log('  ⚠️ 日志是易失的（实测 23 条十分钟内变 3 条）—— 数字偏少不代表跑得少');
    console.log('  ⚠️ 台账 _runs.jsonl 为空：acp-run 从 2026-11-23 起才会自动写');
  }
}

if (!runs.length) {
  console.log('没有有效跑批记录');
  process.exit(0);
}
runs.sort((a, b) => a.at - b.at);

const okN = runs.filter((r) => r.ok).length;
console.log(`跑批记录：${runs.length} 次，成功 ${okN}，失败 ${runs.length - okN}，`
  + `全局成功率 ${Math.round((okN / runs.length) * 100)}%\n`);

/* 逐个列，按时间。这一列本身就是最有用的东西 ——
 * 连续的 ✓ 和连续的 ✗ 比任何百分比都直观。 */
console.log('时间   案        结果  累计');
console.log('─'.repeat(40));
let c = 0;
for (const r of runs) {
  if (r.ok) c++;
  const hh = String(new Date(r.at).getHours()).padStart(2, '0');
  const mm = String(new Date(r.at).getMinutes()).padStart(2, '0');
  console.log(`${hh}:${mm}  ${r.id.padEnd(10)} ${r.ok ? '✓' : '✗'}    ${c}/${runs.indexOf(r) + 1}`);
}

/* 按小时聚合。样本少时会有空格子 —— 那也如实显示。 */
const byHour = new Map();
for (const r of runs) {
  if (!byHour.has(r.hour)) byHour.set(r.hour, { ok: 0, n: 0 });
  const b = byHour.get(r.hour);
  b.n++; if (r.ok) b.ok++;
}
console.log('\n按小时：');
for (const h of [...byHour.keys()].sort((a, b) => a - b)) {
  const { ok, n } = byHour.get(h);
  const bar = '█'.repeat(Math.round((ok / n) * 10)).padEnd(10, '░');
  console.log(`  ${String(h).padStart(2, '0')}:00  ${bar}  ${ok}/${n}`);
}

/* 最长连败 —— 这是「该等窗口了」的最直接信号。 */
let worst = { len: 0, end: null };
let cur = 0;
for (const r of runs) {
  if (r.ok) { cur = 0; continue; }
  cur++;
  if (cur > worst.len) worst = { len: cur, end: r.id };
}

console.log('');
if (worst.len >= 3) {
  console.log(`⚠️ 最长连败 ${worst.len} 次（到 ${worst.end}）—— 按判据，这时该等窗口，不该查案。`);
} else {
  console.log(`最长连败 ${worst.len} 次 —— 还没到「整批在挂」的程度。`);
}

/* 判据提醒。这段是沉默成本最高的地方：看到单案连挂三次，
 * 第一反应永远是「那个案有问题」，而实际多数时候是时段问题。 */
console.log('');
console.log('判据：连续失败时，先看同期别的案成不成功。');
console.log('  · 别的案也挂 → 等窗口');
console.log('  · 只有这个案挂 → 才去查那个案');
