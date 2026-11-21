#!/usr/bin/env node
/* 盲测管线的健康检查：现在值不值得花时间跑一个案？
 *
 * 【为什么需要它 —— 2026-11-21 实测】
 *
 * S15 连跑两次都失败，但两次的失败原因不同，而 `acp-run.mjs` 报的
 * 「超时」把两者混成了一句话：
 *
 *   · 第一次：`_acp-events.json` 是 `[]` —— 会话建立了但上游一个字没吐
 *     （那条调用的 error 是 `Upstream rate limit exceeded`）
 *   · 第二次：事件文件都没生成 —— 会话就没建立起来
 *
 * 两种都不等于「模型做不出这个案」。而如果读成后者，结论会完全走偏
 * （会去改提示词，或者把 S15 判成"太难"）。这个仓库为此吃过亏，
 * 记在 05-RESUME-HERE.md §一：「TaskStop 停掉监控 shell 不等于停掉运行」。
 *
 * 【实测到的东西】
 *
 * 对代理跑一个 5-token 的请求，连测三次：
 *
 *   第 1 次  28.0s
 *   第 2 次  22.7s
 *   第 3 次   3.8s
 *
 * 抖 7 倍。而一个盲测产物要吐 7–8 KB 的 HTML（约 2–3 K token），
 * 按 3.8s/5token 的好情况约 10 分钟，按 28s/5token 的坏情况要一个多小时。
 * 所以「超时」几乎是必然的，与案本身的难度无关。
 *
 * 【判据】
 *
 * 用最小请求测延迟，给出三档建议。**不自动开跑**：这个脚本只回答
 * "现在值不值得花时间"，不替人做决定，因为它测不到上游什么时候恢复。
 *
 * 用法：
 *   node _pipeline-health.mjs
 *   node _pipeline-health.mjs --runs 5     # 多测几次，看方差
 *
 * 退出码：绿色 0；黄色 0（能跑但慢）；红色 1（不值得跑）
 */
import { execFileSync } from 'node:child_process';

const PROXY = 'http://127.0.0.1:15721';
const MODEL = 'openai/gpt-5.6-luna';

const runsArg = process.argv.indexOf('--runs');
const RUNS = runsArg > 0 ? Number(process.argv[runsArg + 1]) || 3 : 3;

function ping(timeoutSec) {
  try {
    const out = execFileSync('curl', [
      '-s', '-w', '\n%{http_code} %{time_total}',
      '--max-time', String(timeoutSec),
      '-X', 'POST', `${PROXY}/v1/chat/completions`,
      '-H', 'Content-Type: application/json',
      '-d', JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: 'ok' }], max_tokens: 5 }),
    ], { encoding: 'utf8', timeout: (timeoutSec + 5) * 1000 });
    /* 响应体与状态码要分开取：失败时 body 里有上游的原始错误，
     * 那是判断"谁的锅"的唯一依据（见下面失败分支的注释）。 */
    const nl = out.lastIndexOf('\n');
    const body = out.slice(0, nl).trim();
    const [code, time] = out.slice(nl + 1).trim().split(/\s+/);
    return { ok: code === '200', code, sec: Number(time), body };
  } catch (e) {
    return { ok: false, code: 'timeout/err', sec: null, body: (e.stdout || '') };
  }
}

console.log('盲测管线健康检查\n');
console.log(`  代理 ${PROXY}，模型 ${MODEL}，最小请求（5 token）连测 ${RUNS} 次：\n`);

const samples = [];
let lastErr = '';
for (let i = 0; i < RUNS; i++) {
  const r = ping(90);
  samples.push(r);
  /* 只收失败响应的 body —— 成功的 body 是正常回复，不是错误，
   * 拿它当"错误原文"打印出来会误导（实测踩过一次：
   * 一次成功 31.7s 的响应体被当成错误打了出来）。 */
  if (!r.ok && r.body) lastErr = r.body;
  console.log(`    第 ${i + 1} 次：${r.ok ? r.sec.toFixed(1) + 's' : r.code}`);
}

/* ── 失败时把根因报出来，别只说"不可用" ────────────────────────────────
 *
 * 2026-11-21 实测拿到的原文：
 *
 *   CC Switch local proxy failed while handling Codex endpoint /chat/completions.
 *   Provider: S3 AI; model: openai/gpt-5.6-luna;
 *   cause: 请求超时: 上游请求超时: error sending request:
 *          client error (Connect): operation timed out
 *
 * 这条信息很关键：**代理本身是活的**（`/v1/models` 13ms 返回 200），
 * 断的是它到上游 provider 那一段。两者要分清 ——
 * 代理挂了要重启，上游断了只能等，处置完全不同。
 *
 * 另外实测换模型也没用：`MiniMax-M2.7-free` 报同样的错、同一个 provider。
 * 所以这**不是模型的问题**，那个 provider 的出口整个不通。 */
if (lastErr) {
  console.log('');
  console.log('  上游返回的错误原文：');
  try {
    const j = JSON.parse(lastErr);
    const msg = (j.error && j.error.message) || lastErr;
    const provider = (j.error && j.error.provider) || '?';
    const cause = msg.match(/cause:\s*(.+)$/);
    console.log(`    provider：${provider}`);
    if (cause) console.log(`    cause：   ${cause[1].slice(0, 160)}`);
    else console.log(`    ${msg.slice(0, 200)}`);
    /* 把"谁的锅"说清楚，这决定了该做什么 */
    if (/Connect|timed out|超时/.test(msg)) {
      console.log('');
      console.log('    这是**代理到上游那一段**断了，不是代理本身挂了。');
      console.log('    实测 /v1/models 仍能 13ms 返回 200，换模型也没用');
      console.log('    （MiniMax-M2.7-free 报同样的错、同一个 provider）。');
      console.log('    所以：不重启代理，等 provider 恢复。');
    }
  } catch {
    console.log(`    ${lastErr.slice(0, 200)}`);
  }
}

const good = samples.filter((s) => s.ok && s.sec != null);
if (!good.length) {
  console.log('\n  ✗ 三次全部失败 —— 上游不可用，现在跑任何案都会失败。');
  console.log('    这不等于"案太难"，也不等于提示词有问题。等上游恢复再跑。');
  process.exit(1);
}

const times = good.map((s) => s.sec).sort((a, b) => a - b);
const median = times[Math.floor(times.length / 2)];
const worst = times[times.length - 1];

/* 粗估：一个产物约 2–3K token，用"每 5 token 的中位耗时"线性外推。
 * 这是**下界估计** —— 长输出通常比短输出慢得更多（自回归逐步生成）。 */
const perTok = median / 5;
const estMin = (2500 * perTok) / 60;

console.log('');
console.log(`  中位 ${median.toFixed(1)}s　最慢 ${worst.toFixed(1)}s　成功 ${good.length}/${RUNS}`);
console.log(`  按中位外推一个 2.5K token 的产物：约 ${estMin.toFixed(0)} 分钟（下界）`);
console.log('');

if (median <= 5) {
  console.log(`  ✓ 绿色：可以跑。单案预计 ${estMin.toFixed(0)} 分钟以内，acp-run 的默认 10 分钟够。`);
  process.exit(0);
} else if (median <= 15) {
  console.log(`  ~ 黄色：能跑但慢。建议 --timeout 1800000（30 分钟），否则大概率超时。`);
  console.log('    超时 ≠ 做不出来，读日志时要分清。');
  process.exit(0);
} else {
  console.log(`  ✗ 红色：不建议现在跑。单案预计 ${estMin.toFixed(0)} 分钟以上，`);
  console.log('    而 acp-run 默认 10 分钟、加到 25 分钟也未必够。');
  console.log('    上游延迟抖动很大（实测 3.8s–28s），等它稳定再跑更省时间。');
  process.exit(1);
}
