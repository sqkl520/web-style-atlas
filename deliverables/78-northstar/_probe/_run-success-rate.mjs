/* 跑批成功率 —— 一个一直没人记录、但会误导判断的指标。
 *
 * 为什么需要它：
 * 不知道基线是多少，就分不清两件事：
 *   · **某个案连续失败** → 那个案有问题（提示词太长？某种句式让模型卡住？）
 *   · **某个时段连续失败** → 上游有问题
 * 这两个的处置完全相反。而在此之前，每失败一次就清理目录重跑，痕迹也没了。
 *
 * 2026-11-23 首次实测：12/14 ≈ 86%，失败的 S10（三次）和 S12 没有共同特征
 * （S10 提示词短产物大、S12 提示词长产物小），所以判为上游波动而非案难度。
 *
 * 数据来源：只数**磁盘上留着产物目录**的案。已经被 rm 掉的失败跑查不到 ——
 * 这是本脚本的已知局限，所以 acp-run 的失败路径现在会提示别急着删。
 */
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BT = join(resolve(HERE, '..'), '_blindtest');

const dirs = readdirSync(BT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}(-r\d+)?$/.test(d.name))
  .map((d) => d.name).sort();

const ok = [], bad = [];
for (const id of dirs) {
  const html = join(BT, id, 'index.html');
  const okRun = existsSync(html);
  (okRun ? ok : bad).push(id);
}

console.log(`跑批目录：${dirs.length} 个\n`);

/* 区分「有产物」和「有目录但无产物」——
 * 后者就是失败留下的痕迹。如果一开始就 rm 掉，这里连痕迹都看不到。 */
const failDirs = bad;
if (failDirs.length) {
  console.log('目录存在但没有产物（失败的痕迹）：');
  for (const id of failDirs) {
    const ev = join(BT, id, '_acp-events.json');
    const out = join(BT, id, '_agent-output.txt');
    let shape = '② 连事件文件都没有 → 会话压根没建立';
    if (existsSync(ev)) {
      let empty = true;
      try { empty = JSON.parse(readFileSync(ev, 'utf8')).length === 0; } catch { empty = false; }
      shape = empty
        ? '① 事件文件是 [] → 会话建了，上游没吐字'
        : '③ 有事件但不完整 → 调了工具后进程死';
    }
    console.log(`  ${id}  ${shape}${existsSync(out) ? '（有 agent 输出）' : ''}`);
  }
  console.log('');
} else {
  console.log('（没有失败痕迹 —— 注意：可能是失败后已被清理，那就查不到了）\n');
}

const total = ok.length + bad.length;
const rate = total ? Math.round((ok.length / total) * 100) : 0;
console.log(`成功率：${ok.length}/${total} = ${rate}%`);

/* 基线参照。这不是判据，是让人把「这次的失败」放进上下文里看：
 * 一次失败在 86% 的成功率下是常态，三次连续失败才值得查。 */
console.log('');
console.log('基线参照（2026-11-23 首测 86%）：');
console.log('  · 偶尔一个案失败      → 常态，重跑即可');
console.log('  · 同一个案连续 3 次   → 查那个案（提示词长度 / 某类句式）');
console.log('  · 一个时段连续失败    → 查上游，不是案的问题');
console.log('  · 成功率明显低于 80%  → 上游真的坏了，别把失败读成「案做不出来」');

/* 这个脚本只报不判：成功率取决于上游状态，红了也不代表仓库有问题。 */
process.exit(0);

