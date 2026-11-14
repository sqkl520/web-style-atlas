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
  {
    /* 2026-11-14 新增：同一份文档里两处互相矛盾 —— §零 说 S98 作废，
     * §四 还给它打绿勾「✅ 不承重」。 */
    anchor: /不承重，2 小时零产物/,
    what: 'S98「✅ 不承重，2 小时零产物」',
    verdictBy: '同文档 §零 已判「S98 作废，被 524 打断」，07-NEGATIVE-B.md 给了原始行号',
    fixedAt: '2026-11-14 已划掉',
    allowedIn: /作废|更正|划掉|仍写|必须 == 0/,
  },
  {
    /* 这条最险：它写在「已排除的替代解释」里，把真正的原因排除了。
     * 第一次是误判「有 205 处 524」，第二次是误判「全是 UUID，真实 0」。
     * 两次都错在同一个地方：只看了 stream 的前半段。 */
    anchor: /真实错误数\s*=\s*0|真实错误数 = 0/,
    what: 'S98「不是 API 故障，真实错误数 = 0」',
    verdictBy: '07-NEGATIVE-B.md:13-24 给出 10 条 api_retry 的原始行号（都在第 5.8 万行后）',
    fixedAt: '2026-11-14 已划掉并改写',
    allowedIn: /错|更正|划掉|又错/,
  },
  {
    anchor: /正对照\s*\|\s*通用「漂亮页面」的描述[^|]*\|\s*❌\s*未做/,
    what: '正对照「❌ 未做」',
    verdictBy: '08-POSITIVE-CONTROL.md —— 它就是 S97，466 行完整页，早就做完了',
    fixedAt: '2026-11-14 已改成「✅ 已做」',
    allowedIn: /更正|已做|早已/,
  },
  {
    /* 2026-11-14 按时间线扫出来的：03-INTERIM（11-12）拿 3px/2px 当依据判 ✅，
     * 而 11-14 查实 CSS 真相是 1px/1.5px（35-s31-contradiction-evidence.md）。
     * 判定本身没错（产物确实复刻了提示词给的数），但它不能当「规格正确」的证据。 */
    anchor: /主刻度.*3px 宽.*\| *✅/,
    what: '03-INTERIM 用「主刻度 3px 宽」判 ✅',
    verdictBy: '_probe/35-s31-contradiction-evidence.md —— 3px/2px 是规格写错的，CSS 真相是 1.5px/1px',
    fixedAt: '2026-11-14 已加更正块（✅ 保留，但不能当规格正确的证据）',
    allowedIn: /更正|复刻了|不是 CSS 的真相|35-s31/,
  },
  {
    /* 隔离判据缺了第三条。只有 READ + CONTROL 时，写权限还开着也能通过。 */
    anchor: /期望输出必须同时出现 `READ_REPO_DENIED` 与 `READ_CONTROL_OK/,
    what: '隔离判据只要求两条（READ + CONTROL）',
    verdictBy: '_deny-verify.ps1 实测只有 (RX) 时 WRITE_REPO_OK —— 必须三条',
    fixedAt: '2026-11-14 已改成三条（加 WRITE_REPO_DENIED）',
    allowedIn: /WRITE_REPO_DENIED|三条|半个隔离/,
  },
  {
    /* 2026-11-14 加：任何提到「S98 + 零产物」却不带作废标注的行都该报。
     * 实测 05-RESUME-HERE 总结段就有一行「S98 有文字、无数值 → 零产物」，
     * 缺作废标注 —— 而那是交接文档最顶上的一段，新会话第一眼就看见。
     * 我一开始没抓到，因为已有锚点用的是具体句式，这行是另一种写法。 */
    anchor: /S98[^\n]{0,30}零产物/,
    what: 'S98 零产物（未标作废）',
    verdictBy: '07-NEGATIVE-B.md —— S98 被 524 打断，结论作废，不能当「无数值做不出」的证据',
    fixedAt: '2026-11-14 已在交接文档补作废标注',
    allowedIn: /作废|524|打断|未跑完|不能用来|无法区分|仍写|必须 == 0/,
  },
];

const MAIN_REPORTS = [
  'README.md',
  'deliverables/78-northstar/06-BLIND-RESULT.md',
  'deliverables/78-northstar/05-RESUME-HERE.md',
  'deliverables/78-northstar/08-POSITIVE-CONTROL.md',
  'deliverables/78-northstar/10-RERUN-PLAN.md',
  'deliverables/78-northstar/11-POSTBUG-PLAN.md',
  /* 按时间线补进来的早期报告 —— 它们更早，更容易「被推翻但自己没标」。
   * 2026-11-14 扫时间线时发现 03-INTERIM（11-12）和 15-real-isolation（11-12）
   * 各有这样一处。 */
  'deliverables/78-northstar/03-INTERIM-REPORT.md',
  'deliverables/78-northstar/_probe/15-real-isolation.md',
  'deliverables/78-northstar/_probe/12-main-thread-measure-findings.md',
  'deliverables/78-northstar/04-ROUND-REPORT.md',
  'deliverables/78-northstar/07-NEGATIVE-B.md',
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
      /* ⚠️ 还要看**上文**：更正块通常写在表格上面，而表格行本身
       * 只写着原始数据、不带「更正」二字。
       * 判据：往前看 30 行（同一节内），出现「2026-11-14 更正」这类标记就放过。
       * 实测不加这一条会误报 03-INTERIM:88 与 15-real-isolation:370 ——
       * 那两处的更正块就在表格上方第 5–10 行。 */
      const above = lines.slice(Math.max(0, i - 30), i).join('\n');
      if (/2026-11-14 更正|2026-11-14 补|本节 2026-11-14|⚠️ \*\*2026-11-14/.test(above)) continue;
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
