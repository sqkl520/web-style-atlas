#!/usr/bin/env node
/* 散文序数闸门：签名怪癖 / 机制句 / 硬前提里写死的条目序号，会不会和"按你的数量排"打架？
 *
 * 【为什么需要它 —— 2026-11-21 的实测】
 *
 * 提示词的结构约束第 2 条对所有案都写着「你手上有 N 条内容，就排 N 条」。
 * 但 `quirk` / `mechanism` / `reuse` 这三个**自由散文字段**各自又把条目数写死了一遍，
 * 于是同一个提示词里出现互不相容的数。实测 S19：
 *
 *   「这个版式设计时排了 20 个条目」        ← 结构段
 *   「你手上有 5 条内容，就排 5 条」        ← 结构段
 *   「卡号从 001 到 240…第 240 张的压痕…」  ← 怪癖段
 *
 * 后果已经发生：盲测产物 `_blindtest/S19/index.html:330` 真的写着
 * `<strong class="mono">NORTH-KEY / 240</strong>` —— 模型忠实执行了怪癖里的 240，
 * 而用户只有 5 张卡。详见 `_probe/79-measurement-layer-audit.md` §十九。
 *
 * 【判据：只判一件最硬的事】
 *
 * 第一版拿「出现第 N 个」当违规，跑出 11 案，逐条读下来大半是误报：
 *
 *   S10「偏移方向按页面序号轮转（第 1 页向右、第 2 页向下，依此循环）」
 *        → 这是**举例说明规律**，不是"必须有 2 页"
 *   S17「多出一枚齿孔，位置在第 3 孔与第 4 孔之间」
 *        → 这是**纹理孔位**，不是条目
 *
 * 所以本闸门只判一种情况：**序数大于该案的 minItems**。
 * 因为「第 240 张」在只有 5 条内容的页面上是**逻辑上不可能**的，
 * 而「第 1 页」「第 3 孔」在规则上是自洽的。这是唯一不需要判断语义就能判的界线。
 *
 * 另外单列一条 `degrades=no` 但仍出现**集合总数**（「共 12 章」「整卷 46 条」）的情况 ——
 * 版面能流却声称有固定总数，与"按你自己的数量排"直接冲突。
 *
 * 【为什么其余只报不判】
 * 把「举例」和「要求」分开需要读语义。在能自动区分之前，报出来给人看，
 * 但不阻断。这是本仓库对判据的一贯做法（先只报不判，看误判率再升级）。
 *
 * 用法：
 *   node prototypes/_build/check-prose-counts.mjs
 *   node prototypes/_build/check-prose-counts.mjs --verbose
 *   node prototypes/_build/check-prose-counts.mjs --selftest
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');
const VERBOSE = process.argv.includes('--verbose');

/* 「第 <数> <量词>」。量词表故意收窄到"条目"类 —— 不含"次/年/秒/px"等。 */
const ORD_RE = /第\s*([0-9]+|[一二三四五六七八九十百]+)\s*(块|条|个|枚|张|行|格|章|孔|页|处|只|道|位|级|层|档)/g;
const TOTAL_RE = /(?:共|整卷|全部|合计)\s*([0-9]+)\s*(块|条|个|枚|张|章|孔|行|格)/g;
const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const toNum = (s) => (/^\d+$/.test(s) ? Number(s) : (CN[s] || null));

/* 判据本体：纯函数，输入散文与 N，输出分类结果。
 * 抽出来是为了让自测能直接打进来。 */
function judgeProse(prose, N, degrades) {
  const ordinals = [];
  let m;
  const re = new RegExp(ORD_RE.source, 'g');
  while ((m = re.exec(prose))) {
    const n = toNum(m[1]);
    if (n == null) continue;
    ordinals.push({ text: m[0].replace(/\s+/g, ' '), n });
  }
  const totals = [];
  const re2 = new RegExp(TOTAL_RE.source, 'g');
  while ((m = re2.exec(prose))) {
    const n = toNum(m[1]);
    if (n != null) totals.push({ text: m[0].replace(/\s+/g, ' '), n });
  }

  /* 硬判据：序数 > N —— 在只有 N 条内容的页面上逻辑上不可能 */
  const overN = ordinals.filter((o) => o.n > N);
  /* 硬判据：版面能流（degrades=no）却声称有固定总数 */
  const pinnedTotal = degrades === 'no' ? totals.filter((t) => t.n > 0) : [];

  return {
    ordinals,
    totals,
    overN,
    pinnedTotal,
    fail: overN.length > 0 || pinnedTotal.length > 0,
    /* 只报不判的部分：序数 ≤ N 但确实写死了 */
    report: ordinals.filter((o) => o.n <= N),
  };
}

function run({ verbose = VERBOSE } = {}) {
  const win = {};
  new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8'))(win);
  const P = {};
  new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8'))(P);

  const fails = [];
  const reports = [];
  for (const s of win.SCHEMES) {
    const sp = P.STYLE_PROMPTS.schemes.find((x) => x.id === s.id);
    if (!sp) continue;
    const N = sp.minItems;
    const dg = sp.capacity && sp.capacity.degrades;
    const prose = [s.quirk, sp.dna && sp.dna.mechanism, sp.dna && sp.dna.reuse].filter(Boolean).join('\n');
    const r = judgeProse(prose, N, dg);
    if (r.fail) fails.push({ id: s.id, N, dg, ...r });
    else if (r.report.length || r.totals.length) reports.push({ id: s.id, N, dg, ...r });
    if (verbose && (r.ordinals.length || r.totals.length)) {
      console.log(`  ${s.id} N=${N} degrades=${dg}  序数:${r.ordinals.map((o) => o.text).join(' ') || '无'}  总数:${r.totals.map((t) => t.text).join(' ') || '无'}`);
    }
  }
  return { fails, reports };
}

function selfTest() {
  const S = [];
  const eq = (name, got, want) => S.push([name, JSON.stringify(got) === JSON.stringify(want), got, want]);

  /* ── 硬判据：序数 > N ── */
  /* S19 的真实原文：N=20，但怪癖说 240 —— 必须报 */
  const s19 = '位置随卡号从 001 到 240 每 20 张向右下偏移 1px，因此第 240 张的压痕比第 001 张低了 12px';
  const r19 = judgeProse(s19, 20, 'yes');
  eq('S19/第240张 > N=20 → 违规', r19.fail, true);
  eq('S19/命中的是 240', r19.overN.map((o) => o.n), [240]);

  /* S34 的真实原文：N=7，说"第七块" —— 7 不大于 7，不算硬违规 */
  const s34 = '第七块（下一期什么时候）的右边距，永远比其余六块窄 12px';
  eq('S34/第七块 = N=7 → 不硬判', judgeProse(s34, 7, 'no').fail, false);
  /* 但它应该在"只报不判"里出现 */
  eq('S34/第七块 进报告清单', judgeProse(s34, 7, 'no').report.length, 1);

  /* ── 误报基线：这几条必须**不**违规 ── */
  /* S10 的页码举例 */
  eq('S10/页码举例不算违规', judgeProse('偏移方向按页面序号轮转（第 1 页向右、第 2 页向下，依此循环）', 12, 'no').fail, false);
  /* S17 的纹理孔位 */
  eq('S17/孔位举例不算违规', judgeProse('永远多出一枚倒置的 1.2px 齿孔，位置在第 3 孔与第 4 孔之间', 27, 'no').fail, false);
  /* 没有序数的散文 */
  eq('无数字的散文不违规', judgeProse('纸色只允许一个值，主色占四成', 10, 'no').fail, false);

  /* ── 硬判据：degrades=no 却声称固定总数 ── */
  eq('可流版面声称共 12 章 → 违规', judgeProse('共 12 章，第 12 章累计偏移 4.8px', 12, 'no').fail, true);
  eq('可流版面声称总数但 degrades=yes → 不判', judgeProse('共 12 章', 12, 'yes').fail, false);

  /* ── 中文数字 ── */
  eq('中文数字能解析', judgeProse('第八行有偏移', 8, 'no').ordinals.map((o) => o.n), [8]);
  eq('中文数字超过 N 会报', judgeProse('第九块', 8, 'yes').fail, true);

  /* ── 反向：判据不能恒真也不能恒假 ── */
  const a = judgeProse('第 240 张', 20, 'yes').fail;
  const b = judgeProse('第 2 张', 20, 'yes').fail;
  S.push(['变异/序数判据非恒真非恒假', a !== b, { a, b }, '两者不同']);

  const bad = S.filter(([, ok]) => !ok);
  for (const [name, ok, got, want] of S) {
    console.log(`  ${ok ? '✓' : '✗'} ${name}`);
    if (!ok) console.log(`      实得 ${JSON.stringify(got)}，期望 ${JSON.stringify(want)}`);
  }
  console.log(`\n自测：${S.length - bad.length}/${S.length} 通过`);
  return bad.length === 0;
}

if (process.argv.includes('--selftest')) {
  console.log('=== 散文序数闸门自测 ===');
  process.exit(selfTest() ? 0 : 1);
}

const { fails, reports } = run();
console.log('散文序数：怪癖/机制句/硬前提里写死的序号，会不会和"按你的数量排"打架？\n');
if (fails.length) {
  console.log(`  ✗ ${fails.length} 案违规：`);
  for (const f of fails) {
    const why = [];
    if (f.overN.length) why.push(`序数超过版式规模：${f.overN.map((o) => o.text).join(' ')}（N=${f.N}）`);
    if (f.pinnedTotal.length) why.push(`degrades=no 却声称固定总数：${f.pinnedTotal.map((t) => t.text).join(' ')}`);
    console.log(`      ${f.id}  ${why.join('；')}`);
  }
  console.log('');
}
if (reports.length) {
  console.log(`  · ${reports.length} 案有序数但未越界（只报不判 —— 需要人读语义才能区分"举例"与"要求"）：`);
  for (const r of reports) {
    console.log(`      ${r.id}  ${r.report.map((o) => o.text).join(' ') || '（只有总数）'}${r.totals.length ? '  总数:' + r.totals.map((t) => t.text).join(' ') : ''}`);
  }
  console.log('');
}
console.log(`\n合计 FAIL ${fails.length} / 报告 ${reports.length}`);
process.exit(fails.length === 0 ? 0 : 1);
