/* 判别值统计一轮变更：67 → 71，并补上 % 与反向风险段的处理。
 *
 * 两处修正叠加的结果：
 *   ① `%` 正则在末尾要求 \b，而 % 是非单词字符 → 22 案的百分比值从没被抽到
 *   ② 38/38 份任务书都有「最容易做成的错误样子」那段，
 *      里面的数字是作者的设计说明，不是施工目标
 *
 * 只修 ① 会让命中率从 100% 掉到 94.7%（要求产物写出作者的设计说明）；
 * 只修 ② 则仍然漏掉所有百分比约束。
 * 两处都修之后：71 个判别值、100% 命中。
 *
 * 旧值 → 新值：
 *   判别值      67/67  →  71/71
 *   阴性对照    24/737=3.3%  →  28/781=3.6%
 *   倍数        30.7×  →  27.9×
 *   干净判别值  62/62  →  63/63
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const FILES = [
  'deliverables/78-northstar/05-RESUME-HERE.md',
  'deliverables/78-northstar/06-BLIND-RESULT.md',
  'deliverables/78-northstar/10-RERUN-PLAN.md',
  'deliverables/78-northstar/_probe/29-prompt-truncation-bug.md',
  'deliverables/78-northstar/_probe/34-s21-rerun.md',
];

const RULES = [
  ['67/67', '71/71'],
  ['67 个判别值', '71 个判别值'],
  ['3.3%', '3.6%'],
  ['24/737', '28/781'],
  ['30.7×', '27.9×'],
  ['62 个「零份无关产物含它」的干净判别值，62 个全中', '63 个「零份无关产物含它」的干净判别值，63 个全中'],
  ['干净判别值（零份无关产物含它）100% | 62/62', '干净判别值（零份无关产物含它）100% | 63/63'],
  ['干净判别值（零份无关产物含它）: 62 个\n其中自身产物命中: 62 个 = 100.0%',
   '干净判别值（零份无关产物含它）: 63 个\n其中自身产物命中: 63 个 = 100.0%'],
  ['判别值总数: 67　命中: 67', '判别值总数: 71　命中: 71'],
  ['TOTAL discriminators: 67 hits: 67', 'TOTAL discriminators: 71 hits: 71'],
  ['| A. 判别值总数与逐案满分 | = 67 且 100% | 67/67 ✅ |', '| A. 判别值总数与逐案满分 | = 71 且 100% | 71/71 ✅ |'],
];

let changed = 0;
for (const rel of FILES) {
  const p = join(ROOT, rel);
  let s;
  try { s = readFileSync(p, 'utf8'); } catch { console.log(`? 缺 ${rel}`); continue; }
  const before = s;
  for (const [from, to] of RULES) s = s.split(from).join(to);
  if (s !== before) { writeFileSync(p, s); changed++; console.log(`✓ ${rel.split('/').pop()}`); }
  else console.log(`· ${rel.split('/').pop()} 无改动`);
}
console.log(`\n${changed}/${FILES.length} 份有改动`);
