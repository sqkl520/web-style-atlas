/* 把阴性对照的三个数字从「3.8% / 28/737 / 60」更新为「3.3% / 24/737 / 62」。
 *
 * 起因：_discriminator-check 的自测用例抓到 hitIn 的一个 bug ——
 * 数值分支用 `html.includes(t.toUpperCase())` 做子串搜索，
 * 于是 '160PX' 会被当成命中了 '60PX'。
 * 修掉之后跨单位/跨数字的假命中不再计入，阴性对照更干净：
 *
 *   非对角线   28/737 = 3.8%  →  24/737 = 3.3%
 *   倍数       26.3×          →  30.7×
 *   干净判别值 60/60          →  62/62
 *
 * 三份脚本（check / crosscheck / evidence-gate）的实现同源，都已修。
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
  'deliverables/78-northstar/_probe/31-content-instability.md',
];

const RULES = [
  ['3.8%', '3.3%'],
  ['28/737', '24/737'],
  ['26.3×', '30.7×'],
  ['26 倍', '31 倍'],
  ['60 个「零份无关产物含它」的干净判别值，60 个全中', '62 个「零份无关产物含它」的干净判别值，62 个全中'],
  ['干净判别值（零份无关产物含它）100% | 60/60', '干净判别值（零份无关产物含它）100% | 62/62'],
  ['干净判别值（零份无关产物含它）: 60 个\n其中自身产物命中: 60 个 = 100.0%',
   '干净判别值（零份无关产物含它）: 62 个\n其中自身产物命中: 62 个 = 100.0%'],
];

let changed = 0, total = 0;
for (const rel of FILES) {
  const p = join(ROOT, rel);
  let s;
  try { s = readFileSync(p, 'utf8'); } catch { console.log(`? 缺文件 ${rel}`); continue; }
  const before = s;
  for (const [from, to] of RULES) s = s.split(from).join(to);
  if (s !== before) {
    writeFileSync(p, s);
    const n = RULES.filter(([f]) => before.includes(f)).length;
    console.log(`✓ ${rel.split('/').pop()}　应用 ${n} 条规则`);
    changed++;
  } else {
    console.log(`· ${rel.split('/').pop()}　无需改动`);
  }
  total++;
}

console.log(`\n${changed}/${total} 份有改动。`);
console.log('\n仍含旧数字的行（需人工确认是否为历史叙述）:');
for (const rel of FILES) {
  const p = join(ROOT, rel);
  try {
    readFileSync(p, 'utf8').split('\n').forEach((l, i) => {
      if (/3\.8%|28\/737|26\.3×|60 个/.test(l) && !/→|原|曾|改|历史/.test(l)) {
        console.log(`  ${rel.split('/').pop()}:${i + 1}  ${l.trim().slice(0, 90)}`);
      }
    });
  } catch { /* ignore */ }
}
