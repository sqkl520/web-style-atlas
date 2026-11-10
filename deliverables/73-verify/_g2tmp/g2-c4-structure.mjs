/* 攻击 #3：直接打 isMeta 的结构判据本身
 *
 * isMeta = 「元语境主语」+「工具动作」同句 → 放过。
 * 但「检查器没发现 X 未修」这句话**同时**是：
 *   (a) 关于工具的描述（主语+动作都在）
 *   (b) 一条真实的欠款声称（X 未修）
 * 判据把 (a) 当作放过理由，于是 (b) 被一起丢掉。
 * 下面 4 条都是**真欠款**，只是用工具主语+工具动作来叙述。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const CON = `${ROOT}/prototypes/_CONTRACT.md`;
const orig = readFileSync(CON, 'utf8');
const ANCHOR = '## 10 ';
const run = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-contract.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') }; }
};
const restore = () => writeFileSync(CON, orig, 'utf8');

const CASES = [
  '这个工具至今没有发现：`S13` 的 17 处 `shadow` 属真未修。',
  '检查器没有报出 `S13` 的 17 处 `shadow` 属真未修，所以它还欠着。',
  '`S13` 的 17 处 `shadow` 属真未修——该规则从未被任何断言检测到已清。',
  '`S13` 的 17 处 `shadow` 属真未修；这个工具只会据此放行，不会修它。',
];

restore();
console.log(`═══ 基线 exit=${run().code} ═══`);
const out = [];
for (const c of CASES) {
  restore();
  writeFileSync(CON, orig.replace(ANCHOR, c + '\n\n' + ANCHOR), 'utf8');
  const res = run();
  const red = res.code === 1 && /C4-doc-claims-fail-that-is-gone/.test(res.out);
  out.push({ c, red });
  console.log(`${red ? '✓ 抓到' : '✗ 漏报'}   ${c}`);
}
restore();
const caught = out.filter((x) => x.red).length;
console.log(`\n═══ 结构判据绕过: 抓到 ${caught}/${out.length}（漏 ${out.length - caught} 条真欠款） ═══`);
const b = run();
console.log(`恢复后 exit=${b.code}`);
