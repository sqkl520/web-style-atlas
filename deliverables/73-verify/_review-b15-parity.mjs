/* ab-texture.mjs 为什么 6/6 全过，而真实文件里的 body 违规被漏掉？
 *
 * 假设：ab-texture 把变异块**追加到文件末尾**，而末尾那一块是否被
 * check-texture 的选择器正则看到，取决于它在规则序列里的**奇偶位**。
 * 也就是说 6/6 是"位置运气"，不是判据正确。
 *
 * 验证：同一段 `body { background-image: … }`，分别追加到 S01 与 S02 末尾，
 * 看闸门是否都能抓到。若有一个漏，则测试设计掩盖了缺陷。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const BLOCK = 'body { background-image: url("assets/grain.png"); }';
const CASES = [
  ['S01-red-wedge-broadsheet', `${ROOT}/prototypes/S01-red-wedge-broadsheet/style.css`],
  ['S02-gilded-symmetry-salon', `${ROOT}/prototypes/S02-gilded-symmetry-salon/style.css`],
  ['S24-cyanotype-rainforest-path', `${ROOT}/prototypes/S24-cyanotype-rainforest-path/style.css`],
];

const run = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-texture.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') }; }
};

console.log('同一段违规 CSS 追加到不同案的末尾：\n');
for (const [name, f] of CASES) {
  const orig = readFileSync(f, 'utf8');
  writeFileSync(f, orig + '\n' + BLOCK + '\n', 'utf8');
  const r = run();
  const caught = r.code === 1 && /T[12]-body/.test(r.out);
  console.log(`${caught ? '✓ 抓到' : '✗ 漏掉'}  ${name}   (exit=${r.code})`);
  writeFileSync(f, orig, 'utf8');
}
console.log('\n结论（与上面的实测对齐，不夸大）：');
console.log('  1. 追加到**文件末尾**时，闸门能抓到 —— 因为末尾这一块前面正好有一个未被消耗的 `}` 作锚点。');
console.log('     ab-texture.mjs 的 6 个变异**全部**是这种"追加到末尾"的形态。');
console.log('  2. 但闸门对**文件中间**的规则只看到隔一条（见 _probe-minimal.mjs 用例 1/4）。');
console.log('     S02 真实的 body 规则恰好处在被跳过的那一位 —— 它挂了 background-image，闸门报全绿。');
console.log('  3. 所以 6/6 证明的是"末尾追加的违规能抓到"，不能证明"任一行上的违规能抓到"。');
console.log('     测试的形态单一（只测一种位置），是这个缺陷没被自己抓住的原因。');
