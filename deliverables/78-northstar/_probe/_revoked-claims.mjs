/* 检查主报告里有没有引用「已被 _probe 下某份报告判定为作废/不可用」的东西。
 *
 * 起因（真实案例）：`20-reproducibility.md:242` 和 `09-VERIFY-PLAN.md:119`
 * 都指出「06-BLIND-RESULT §3.1 那组秒数不可引用」，但 06 里那张表一直挂着没改。
 * 下一个读 06 的人会直接抄走那组错数。
 *
 * 这类缺陷的特征：**结论已经下达，原文没有执行。**
 * 它和「数字重复」不同 —— 反向索引抓不到，因为它不是同一个数字出现在多处，
 * 而是一个数字被别处否定、本体却没动。
 *
 * 做法：从 _probe 下收集「被判为作废的表述锚点」，再查主报告里还在不在。
 * 这一步只能做到「锚点匹配」，做不到语义理解 —— 所以命中项需要人看。
 * 宁可少报也不要天天误报（教训写在 _fact-index.mjs 的注释里）。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const BASE = join(ROOT, 'deliverables/78-northstar');

/* 已知的「结论已下达但原文可能没改」清单。
 *
 * ⚠️ 这个清单必须手维护 —— 我试过自动从 `不可引用|已作废` 这些词里抽，
 * 抽出来的是整句话，没法拿去主报告里做锚点匹配。
 * 每加一条，都要写清：谁下的结论、在哪份报告、被否的是什么。 */
const REVOKED = [
  {
    anchor: /331s|1027s|5582s/,          // 06 §3.1 那张秒数表
    what: '盲测耗时表（S18 331s / S15 1027s / S29 5582s）',
    verdictBy: '_probe/20-reproducibility.md:242 与 _probe/09-VERIFY-PLAN.md:119 都判「不可引用」',
    fixedAt: '2026-11-14 已改成 result.duration_ms 实测值',
    allowedIn: /更正|原表写|不可引用|历史|与实测差|差 5~15 倍|来源不明/,
  },
  {
    anchor: /线宽全中\s+8\/10/,
    what: '线宽 8/10（S13 缺 9px/14.5px、S18 缺 4px）',
    verdictBy: '_probe/29-prompt-truncation-bug.md §三 判「判据方向反了 + Chrome 截断」',
    fixedAt: '2026-11-14 已改成 10/11',
    allowedIn: /更正|上一版|假失败|历史/,
  },
  {
    anchor: /64\/64\s*判别值/,
    what: '判别值 64/64（S21 重跑前）',
    verdictBy: '_probe/34-s21-rerun.md 证明 S21 重跑成功，判别值应为 67/67',
    fixedAt: '2026-11-14 已改成 67/67',
    allowedIn: /重跑前|从 64 变|历史|更正/,
  },
];

const MAIN_REPORTS = [
  'README.md',
  'deliverables/78-northstar/06-BLIND-RESULT.md',
  'deliverables/78-northstar/05-RESUME-HERE.md',
  'deliverables/78-northstar/08-POSITIVE-CONTROL.md',
  'deliverables/78-northstar/10-RERUN-PLAN.md',
  'deliverables/78-northstar/11-POSTBUG-PLAN.md',
];

console.log('=== 检查：被别处判为作废的表述，主报告里还在不在 ===\n');
let hits = 0;
for (const rel of MAIN_REPORTS) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) { console.log(`? 缺文件 ${rel}`); continue; }
  const lines = readFileSync(p, 'utf8').split('\n');
  const found = [];
  lines.forEach((line, i) => {
    for (const r of REVOKED) {
      if (!r.anchor.test(line)) continue;
      /* 允许出现在「更正说明」里 —— 那种行必须同时提到这是历史/更正 */
      if (r.allowedIn.test(line)) continue;
      found.push({ lineNo: i + 1, what: r.what, text: line.trim().slice(0, 100) });
    }
  });
  if (found.length) {
    console.log(`${rel}`);
    for (const f of found) {
      console.log(`  ✗ :${f.lineNo}　还在引用「${f.what}」`);
      console.log(`      ${f.text}`);
    }
    console.log('');
    hits += found.length;
  }
}

if (hits === 0) {
  console.log('✓ 主报告里没有发现「已被驳回但还在引用」的表述');
} else {
  console.log(`✗ 共 ${hits} 处。每一项都该人工确认：真的过时 → 改；`);
  console.log('   如果它已经被包在更正说明里，就把那行加进 allowedIn。');
}
process.exit(hits === 0 ? 0 : 1);
