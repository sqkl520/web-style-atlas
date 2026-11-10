/* B4 的**对照组**：证明上面 9 条逃逸的唯一原因就是那个元语境词，
 * 而不是我的句子结构本身匹配不上 C4 的正则。
 *
 * 同一句、同一位置、同样的窗口长度，只差最后那半句（元词）。
 * 控制组必须红；带元词的必须绿（= 假阳性）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const CON = `${ROOT}/prototypes/_CONTRACT.md`;
const orig = readFileSync(CON, 'utf8');
const restore = () => writeFileSync(CON, orig, 'utf8');
const run = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-contract.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') }; }
};

const BASE = '**现行欠款**：`S13` 的 17 处 `shadow` 属真未修。';
const TAIL = '人工检查器看不出来，只有栅格化能看。';

const pairs = [
  ['C0 对照：句子无元词', BASE + '这件事从 10-24 留到今天。'],
  ['C1 处理组：句子含「检查器」', BASE + TAIL],
];

console.log('═══ 句子只差一个元语境词 ═══');
for (const [name, s] of pairs) {
  restore();
  writeFileSync(CON, orig.replace('## 10 ', s + '\n\n## 10 '), 'utf8');
  const res = run();
  const caught = res.code === 1 && /C4-doc-claims-fail-that-is-gone/.test(res.out);
  console.log(`${caught ? '✓ 抓到' : '✗ 放过'}  ${name}`);
  console.log(`     句子：${s}`);
}
restore();
console.log(`恢复后: exit=${run().code}`);
