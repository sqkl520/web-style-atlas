/* 反向索引：同一个「事实」被哪些报告引用？
 *
 * 为什么要它：S31 的「399 行」出现在 9 份报告里，S97 的「466 行」在 7 份。
 * 改一处不会通知其他处 —— 这一轮已经因为「8/10 该是 10/11」返工过两次。
 *
 * 为什么不能只做「案号 + 数字」的简单索引：实测同一个案号下有十来个不同数字，
 * 分别指产物行数、任务书字节数、提示词长度、stream 行数、色值个数……
 * 简单索引会把这些全混在一起，误报率极高。
 *
 * 所以每条事实带一个**语义标签**，标签由上下文关键词决定：
 *   产物行数   ← 上下文含「行」且不含 task/prompt/stream/快照
 *   产物字节   ← 上下文含「字节/B」且不含 task/prompt/stream
 *   任务书字节 ← 上下文含 task.txt / prompt / 提示词
 *   ……
 * 只有标签明确的才进索引，模糊的不进 —— 宁可少收录，也不要给一个
 * 「改了这个数字要同步 12 处」的假警报。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const STAGED = join(ROOT, 'deliverables/78-northstar/_probe/_staged');

/* ── 权威值：从 _staged 实测 ─────────────────────────────────────── */
const sizeOf = {};
for (const f of readdirSync(STAGED)) {
  const m = f.match(/^(S\d{2})-(?:sandbox|judge)\.html$/);
  if (!m) continue;
  const id = m[1];
  if (sizeOf[id]) continue;
  const buf = readFileSync(join(STAGED, f));
  let lines = 0;
  for (const b of buf) if (b === 0x0a) lines++;
  sizeOf[id] = { lines, bytes: buf.length, file: f };
}

/* ── 扫全部报告，按语义归类 ─────────────────────────────────────── */
const reports = [];
for (const d of ['deliverables/78-northstar', 'deliverables/78-northstar/_probe']) {
  const abs = join(ROOT, d);
  if (!existsSync(abs)) continue;
  for (const f of readdirSync(abs)) {
    if (!f.endsWith('.md') || !/^\d{2}-/.test(f)) continue;
    reports.push({ path: join(d, f), name: f, text: readFileSync(join(abs, f), 'utf8') });
  }
}

/* 上下文 → 语义标签。顺序要紧：更具体的排除规则放前面。
 *
 * ⚠️ 判据要「默认收录、明确排除」，而不是「明确才收录」：
 * 实测第一版要求上下文必须含「产物/页面/输出」，结果 S31 的 399 行
 * 实际有 11 处引用，只收到 3 处 —— 大部分报告就写「S31 399 行」，没有更多上下文。
 * 那种简写恰恰是最需要同步的（改一处不会通知其他十处）。
 *
 * 所以改成：先按排除规则剔除「明确不是产物」的，其余只要数值与实测相符就收。 */
const EXCLUDE_RULES = [
  { label: '任务书', re: /task\.txt|提示词长度的|prompt\s*在|任务书/i },
  { label: '日志', re: /stream|日志|第\s*\d+\s*行|全长/i },
  { label: '历史快照', re: /快照|snapshot|当时|早期|旧版/ },
  { label: '任务书字节', re: /提示词|prompt/i },
];

function excludedBy(line) {
  for (const r of EXCLUDE_RULES) if (r.re.test(line)) return r.label;
  return null;
}

/* 索引：factKey → [{report, line}] */
const index = new Map();
const addFact = (key, report, lineNo, line) => {
  if (!index.has(key)) index.set(key, []);
  index.get(key).push({ report, lineNo, line: line.trim().slice(0, 90) });
};

for (const r of reports) {
  const lines = r.text.split('\n');
  lines.forEach((line, i) => {
    /* 历史变更叙述（A→B）与比较句不收录，它们天然会和当前值不同 */
    if (line.includes('→')) return;
    if (excludedBy(line)) return;
    for (const m of line.matchAll(/\bS(\d{2})\b(?:(?!S\d{2})[^\n]){0,60}?(\d{3,6})\s*行/g)) {
      const id = 'S' + m[1], n = Number(m[2]);
      if (!sizeOf[id]) continue;
      if (n !== sizeOf[id].lines) return;             // 与实测不符的交给 _report-numbers-audit 报
      addFact(`${id} 产物 ${n} 行`, r.name, i + 1, line);
    }
    for (const m of line.matchAll(/\bS(\d{2})\b(?:(?!S\d{2})[^\n]){0,60}?(\d{4,6})\s*(?:字节|B)\b/g)) {
      const id = 'S' + m[1], n = Number(m[2]);
      if (!sizeOf[id]) continue;
      if (n !== sizeOf[id].bytes) return;
      addFact(`${id} 产物 ${n} 字节`, r.name, i + 1, line);
    }
  });
}

/* ── 输出 ───────────────────────────────────────────────────────── */
const multi = [...index.entries()]
  .filter(([, v]) => new Set(v.map((x) => x.report)).size > 1)
  .sort((a, b) => new Set(b[1].map((x) => x.report)).size - new Set(a[1].map((x) => x.report)).size);

console.log('=== 被多份报告共同引用的事实 ===\n');
if (!multi.length) console.log('（无）');
for (const [key, hits] of multi) {
  const byReport = new Map();
  for (const h of hits) {
    if (!byReport.has(h.report)) byReport.set(h.report, []);
    byReport.get(h.report).push(h.lineNo);
  }
  console.log(`${key}　被 ${byReport.size} 份报告引用，共 ${hits.length} 处`);
  for (const [rep, lns] of byReport) console.log(`    ${rep}:${lns.join(',')}`);
  console.log('');
}

/* ── 第二遍：找「提到了该案的产物行数/字节数，但数字与实测不符」的行 ──
 *
 * 为什么需要这一遍：第一遍只收「与实测一致」的引用，于是当某份报告
 * 把 399 改成 999 时，索引只是少了一条 —— **静默地少一条**。
 * 实测过：改一处之后输出从「8 份 9 处」变成「7 份 8 处」，没有任何错误提示。
 *
 * 这一遍专门点名那些「看起来在说产物行数、但数字不对」的地方，
 * 由人判断是「过时未同步」还是「历史记录」。
 */
/* ── 关于「不符检测」：做了，然后撤掉了 ────────────────────────────
 *
 * 我加过一遍：找出「提到了案号的产物行数/字节数，但数字与实测不符」的行，
 * 想用它回答「改了没同步」。实测下来噪声太大，撤掉。
 *
 * 第一版跑出 20+ 条，逐条看过的真实构成：
 *   「S31 414 行」×4      704 秒那次历史运行，报告里写了「704 秒」作区分
 *   「S31 41421 行」×2    那是 stream 行数，不是产物
 *   「S31 55514」         色值相关，根本不是字节数
 *   「S29 39813 行」      session 分段的行号范围
 *   「S13 25730 B」       历史版本，报告已注明且 _staged 里留着副本作证
 *
 * 也就是说：**与实际不符的绝大多数是合法的历史记录**，
 * 而真正「该同步却没同步」的（比如这次 10-RERUN-PLAN 的 64/64）
 * 已经在 _report-numbers-audit.mjs 里被单独抓到了。
 *
 * 一个天天报 20 条假警的检查，下一个人第一件事就是把它关掉。
 * 所以这一节只保留索引，不做判定。
 */

console.log(`合计 ${index.size} 条事实被收录，其中 ${multi.length} 条跨多份报告。`);
console.log('\n判据：只收录**数值与 _staged 实测一致**的引用，且排除上下文明确是');
console.log('      任务书 / stream 日志 / 历史快照的。与实测不符的不进索引 ——');
console.log('      那是 _report-numbers-audit.mjs 的职责（它负责报错，这个负责报"要改几处"）。');
console.log('\n用途：改任何一份报告里的产物数字之前，先看这里它还被谁引用。');
console.log('      实测 S31 的「399 行」被 8 份报告引用 9 处 —— 改一处不会通知其他八处。');
