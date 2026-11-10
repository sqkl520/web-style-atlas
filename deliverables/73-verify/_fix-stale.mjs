/* 一次性清除所有陈旧（变异测试 touch 过多个案，逐个手改太慢）。
 *
 * 策略：反复跑 check-stale，每轮把报告里点名要 render 的案都渲染一遍，
 * 直到它报"全部新鲜"。最多 5 轮（数据链改变会让下游再陈旧）。
 */
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';

const runStale = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-stale.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') }; }
};

const run = (cmd) => {
  try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { return String(e.stdout || '') + String(e.stderr || ''); }
};

for (let round = 1; round <= 6; round++) {
  const r = runStale();
  if (r.code === 0) {
    console.log(`第 ${round} 轮: ✓ 全部新鲜`);
    break;
  }
  /* 从输出里抽出所有要执行的命令 */
  const cmds = [...r.out.matchAll(/→\s+(node\s+prototypes\/_build\/render-scheme\.mjs\s+\S+)/g)].map((m) => m[1]);
  const chainCmds = [...r.out.matchAll(/→\s+(node\s+prototypes\/_prompts\/\S+)/g)].map((m) => m[1]);
  const all = [...new Set([...cmds, ...chainCmds])];

  console.log(`第 ${round} 轮: ${all.length} 项待修`);
  for (const c of all) {
    console.log(`   ${c}`);
    run(c);
  }
  if (!all.length) { console.log('   没有可执行的修复命令，停止'); break; }
}

const final = runStale();
console.log('\n最终:', final.out.match(/全部新鲜|项陈旧/)?.[0] || '?');
console.log(final.out.split('\n').slice(1, 5).join('\n'));
