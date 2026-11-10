/* B4：C4 的「元语境判据」是不是**过宽**了？
 *
 * C4 现在的放过条件之一（check-contract.mjs:333）：
 *   isMeta = /为什么需要|检查器|断言|闸门|抓到|实测\s*0\s*条|这条断言|C[1-5][\-\s]|check-contract|check-twolines/
 *
 * 锐评担心的正是这件事：真正在声称欠款的文字，只要**附近**出现这些词，
 * 就会被当成"在讲工具"而放过。这里构造 8 个反例，全部是**真的在要豁免**
 * （或真的在声称缺陷仍在），只是句子里嵌了元语境的词。
 *
 * 判据：每个都必须红（exit 1 且含 C4-doc-claims-fail-that-is-gone）。
 * 任何一个假绿 = 元语境判据过宽，C4 对"带元词的欠款声称"失明。
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

/* S13 实测 shadow = 0、button-fx = 0；S01 实测 shadow = 0。
 * 所以下面每一句都是**假声称**，必须被抓。 */
const CASES = [
  ['A 含「为什么需要」（真在要豁免）',
    '**现行欠款**：`S13` 的 17 处 `shadow` 属真未修。为什么需要修？因为它是凹陷浮雕，不是投影。'],
  ['B 含「检查器」',
    '**现行欠款**：`S13` 的 17 处 `shadow` 属真未修。人工检查器看不出来，只有栅格化能看。'],
  ['C 含「断言」',
    '**现行欠款**：`S13` 的 17 处 `shadow` 属真未修。此前有一条断言说它已修，那条断言是错的吗？不，它仍在。'],
  ['D 含「闸门」',
    '**现行欠款**：`S13` 的 17 处 `shadow` 属真未修。闸门跑不到这一层，所以留到今天。'],
  ['E 含「抓到」',
    '**现行欠款**：`S13` 的 17 处 `shadow` 属真未修。上一轮抓到的是别的问题，这个没被抓到。'],
  ['F 含「实测 0 条」（说别的规则）',
    '**现行欠款**：`S13` 的 17 处 `shadow` 属真未修（`button-fx` 实测 0 条，但 shadow 不是）。'],
  ['G 含「这条断言」',
    '**现行欠款**：`S13` 的 17 处 `shadow` 属真未修。这条断言自 10-24 起就成立。'],
  ['H 含「C4」字样',
    '**现行欠款**：`S13` 的 17 处 `shadow` 属真未修。C4 那条规则管不到它，别指望。'],
  ['I 含「check-contract」',
    '**现行欠款**：`S13` 的 17 处 `shadow` 属真未修。`check-contract` 只查 FAIL 集合，查不出这个。'],
];

console.log('═══ 基线 ═══');
restore();
let r = run();
console.log(`  exit=${r.code}  ${(r.out.match(/C4[^\n]*/) || ['无 C4 输出'])[0].trim()}`);
if (r.code !== 0) { console.log('  ⚠ 基线不绿'); process.exit(1); }

const rows = [];
for (const [name, sentence] of CASES) {
  restore();
  const next = orig.replace('## 10 ', `**现行欠款**：${sentence}\n\n## 10 `);
  if (next === orig) { rows.push({ name, ok: null, note: '锚点未找到' }); continue; }
  writeFileSync(CON, next, 'utf8');
  const res = run();
  const caught = res.code === 1 && /C4-doc-claims-fail-that-is-gone/.test(res.out);
  rows.push({ name, ok: caught, note: caught ? '' : '假绿：C4 放过了真的欠款声称' });
  restore();
}

restore();
console.log('');
for (const x of rows) {
  console.log(`${x.ok === true ? '✓ 抓到' : x.ok === false ? '✗ 放过' : '? 未测'}  ${x.name}${x.note ? '   ← ' + x.note : ''}`);
}
const caught = rows.filter((x) => x.ok === true).length;
console.log(`\n═══ C4 元语境过宽测试: 抓到 ${caught}/${rows.length} ═══`);
console.log('（抓不到的每一条，都是"带元词的欠款声称"能被真豁免文风掩护过去）');

r = run();
console.log(`恢复后: exit=${r.code}`);
