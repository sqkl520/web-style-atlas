// 契约一致性闸门：FAIL 集合 ⊆ §9.15 允许表
//
// 为什么需要它
// ────────────
// `prototypes/_CONTRACT.md` §7.2 写着完成判据：
//
//     render-scheme.mjs 跑通，FAIL = 0，或
//     FAIL 集合 ⊆ §9.15 允许表 ∪ 逐案批准记录，
//     且每条在交付说明里有一条引到文件行号的豁免理由
//
// 但这句话从前**只靠人读**。这个仓库已经为它翻过一次车，契约自己记着
// （§9.15 `palette-terracotta` 那一行，2026-10-24 Lead 补登记）：
//
//     「此前 README 与「已知缺口」长期写『S08 琥珀是已知豁免，理由见 §9.15』，
//       而 §9.15 从来没有这一行 —— 豁免被反复声称却从未落进允许表。」
//
// 那是「引用跳空」：文档替一个已经不存在的缺陷要豁免。
//
// ⚠️ 2026-10-31 锐评指出：`§7.4` 在契约里**没有定义章节**（实测 397 行、`7.4`
// 只出现在 L127 与 L201 两行共 4 处，全是引用而无定义标题）。所以本文件不引 §7.4，直接描述现象。
// 讽刺的是：一个治「引用跳空」的工具，立论本身引用了一个不存在的章节 —— 已改。
//
// 补了那一行之后引用才为真，但**没有任何机制保证它下次不会再跳空**。本闸门就是那个机制。
//
// 查的是什么（可证伪的六条）
// ──────────────────────────────
//   C1  30 案每份 report.json 的 FAIL 规则名，是否都在 §9.15 允许表里
//       → 不在 = 契约 §7.2 被破坏（有人加了新 FAIL，或改了规则）
//   C2  §9.15 允许表里登记的规则，是否真的**存在于规则引擎**里
//       → 允许表写了一个不存在的规则名 = 表在腐化（拼写错/规则已删）
//   C3  §9.15 允许表里登记、但当前没有任何案触发的规则
//       → 不算失败，但是**审计线索**：可能规则已修好、允许表该收窄
//         （这正是 §9.15 那行自述的教训的另一面：表会过期，要看得见）
//
// 刻意**不查**的：WARN。契约只对 FAIL 有约束，WARN 允许（但要在交付说明里解释）。
//
// 用法：
//   node prototypes/_build/check-contract.mjs [--quiet] [--json]
//   退出码 0 = 契约成立；1 = C1 或 C2 被破坏

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const P = join(ROOT, 'prototypes');
const CONTRACT = join(P, '_CONTRACT.md');
const RULES = join(ROOT, 'tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs');

const QUIET = process.argv.includes('--quiet');
const JSON_OUT = process.argv.includes('--json');

/* ── 解析 §9.15 允许表 ────────────────────────────────────────────────────
 *
 * 表格形状是三列：| 规则 | 为什么在本语料上必然触发 | 处理 |
 * 规则名包在反引号里。只认第一列，避免把理由里提到的别的规则名算进来。
 */
function parseAllowTable(md) {
  /* ⚠️ 2026-10-31 修 bug：v1 用 `md.indexOf('9.15')` 定位。
   *
   * `'9.15'` 第一次出现是在**第 110 行**——§6 那张表里引用 §9.15 的那一行，
   * 而真正的标题 `**9.15 …` 在**第 194 行**。于是切片从第 110 行开始，
   * 把 §6 整张十二行表都吃进了"允许表"。
   *
   * 今天没炸纯属运气：§6 的规则名写成 `| **正文不得 <15px** |`（加粗、无反引号），
   * 而本函数只认反引号，所以那些行没被解析进来。
   * 但只要有人往 §6 加一行 `| \`shadow\` | … |`，它就会被当成允许规则 ——
   * 实测（plan-p1a-mutation.mjs M1b）确实变成 exit 0 的假绿。
   *
   * 修法：只认**行首**的 `**9.15`，那是标题而不是引用。
   * 找不到就抛错，不静默退化成全文扫描 —— 那种退化会让允许表变成"整份契约"。 */
  const secStart = md.search(/^\*\*9\.15/m);
  if (secStart < 0) throw new Error('_CONTRACT.md 里找不到行首的 **9.15 标题');
  const secEnd = md.slice(secStart + 1).search(/^\*\*9\.16/m);
  const sec = secEnd > 0 ? md.slice(secStart, secStart + 1 + secEnd) : md.slice(secStart);
  const rows = new Map();
  let parsedLines = 0;
  for (const line of sec.split(/\r?\n/)) {
    /* ⚠️ 2026-10-31 修 fail-open 缺陷（锐评实测）：
     * 删掉 §9.15 某行规则名的反引号后，该行被跳过 → 允许表**静默 5→4**，
     * 而 C2 仍报 4/4 全绿。这是"表格格式微小变化导致判据静默缩小"。
     *
     * 修法：统计 §9.15 区段里所有以 `| ` 开头、且非表头/分隔线的行数，
     * 与真正解析出规则名的行数对比。凡"看起来像规则行但没解析出名字"的，
     * 收集起来交给调用方报 WARN。 */
    /* 只数「数据行」：排除表头（第一格是 `规则`）与分隔线（`---`） */
    if (/^\|\s*[^|]/.test(line)) {
      const firstCell = line.split('|')[1].trim();
      if (firstCell !== '规则' && !/^-{3,}$/.test(firstCell)) parsedLines++;
    }
    const m = line.match(/^\|\s*`([\w-]+)`\s*\|/);
    if (!m) continue;
    const cells = line.split('|').map((c) => c.trim());
    rows.set(m[1], { rule: m[1], why: cells[2] || '', how: cells[3] || '' });
  }
  if (!rows.size) throw new Error('§9.15 允许表解析出 0 条规则 —— 表格格式变了？');
  rows.__unparsed = Math.max(0, parsedLines - rows.size);
  return rows;
}

/* ── 规则引擎里真实存在的规则 id ──────────────────────────────────────── */
function engineRuleIds() {
  if (!existsSync(RULES)) return null;
  const src = readFileSync(RULES, 'utf8');
  const m = src.match(/export const RULE_IDS\s*=\s*\[([\s\S]*?)\]/);
  if (!m) return null;
  return new Set([...m[1].matchAll(/'([\w-]+)'/g)].map((x) => x[1]));
}

/* ── 逐案读 report.json 的 FAIL ────────────────────────────────────────── */
function caseFails() {
  const dirs = readdirSync(P, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
    .map((d) => d.name)
    .sort();
  const out = [];
  for (const dir of dirs) {
    const rp = join(P, dir, '.inspect', 'report.json');
    if (!existsSync(rp)) { out.push({ id: dir.slice(0, 3), dir, missing: true, fails: [] }); continue; }
    let j;
    try { j = JSON.parse(readFileSync(rp, 'utf8').replace(/^\uFEFF/, '')); }
    catch { out.push({ id: dir.slice(0, 3), dir, unreadable: true, fails: [] }); continue; }
    const fails = (j.findings || []).filter((f) => f.level === 'FAIL');
    out.push({ id: dir.slice(0, 3), dir, at: j.at, fails });
  }
  return out;
}

/* ── 主流程 ────────────────────────────────────────────────────────────── */
const findings = [];
const add = (level, scope, rule, msg) => findings.push({ level, scope, rule, msg });

const allow = parseAllowTable(readFileSync(CONTRACT, 'utf8'));
const engine = engineRuleIds();
const cases = caseFails();

const stats = {
  allowRules: allow.size,
  engineRules: engine ? engine.size : null,
  cases: cases.length,
  failTotal: 0,
  failAllowed: 0,
  failOutside: 0,
  missingReports: 0,
  fail: 0,
  warn: 0,
  info: 0,
};

/* C2 先查：允许表里登记的规则，引擎里真的有吗？
 * 放在 C1 前面，因为如果表本身在腐化，C1 的结论就不可信。 */
if (engine) {
  for (const [rule, meta] of allow) {
    if (!engine.has(rule)) {
      add('FAIL', '_CONTRACT.md §9.15', 'C2-allow-rule-not-in-engine',
        `允许表登记了 \`${rule}\`，但规则引擎的 RULE_IDS 里没有这条` +
        `（表在腐化：拼写错，或规则已被删除而表没跟着删）。处理列写的是：${meta.how.slice(0, 60)}`);
    }
  }
} else {
  add('WARN', '_CONTRACT.md §9.15', 'C2-engine-unreadable',
    `读不到规则引擎的 RULE_IDS（${RULES}），C2 无法判定`);
}

/* C1：逐案 FAIL 是否都在允许表里
 *
 * ⚠️ 2026-10-31 修 bug：v1 把「report.json 缺失/损坏」只报 WARN，
 * 而 exit 只看 FAILS ⇒ **"无法判定"被当成"成立"**。
 * 逻辑漏洞很直白：空集是任何集合的子集，所以「没有 FAIL」既可能是
 * 「真的没有 FAIL」，也可能是「根本没读到」——v1 把两者混为一谈。
 *
 * 实测（plan-p1a-mutation.mjs M5/M6）：删掉某案 report.json 或写坏它，
 * v1 仍然 exit 0。这是假绿。
 *
 * 修法：缺失/损坏升级为 FAIL。无法判定 ≠ 成立。 */
const outside = [];
const triggered = new Set();
for (const c of cases) {
  if (c.missing) {
    stats.missingReports++;
    add('FAIL', c.id, 'C0-report-missing',
      '没有 .inspect/report.json —— 契约 §7.2 的「FAIL ⊆ 允许表」无法判定。' +
      '「无法判定」不等于「成立」，所以按失败处理。修法：node prototypes/_build/render-scheme.mjs ' + c.dir);
    continue;
  }
  if (c.unreadable) {
    stats.missingReports++;
    add('FAIL', c.id, 'C0-report-unreadable',
      'report.json 解析失败 —— 同样无法判定，按失败处理。修法：重跑 render-scheme.mjs ' + c.dir);
    continue;
  }
  for (const f of c.fails) {
    stats.failTotal++;
    triggered.add(f.id);
    if (allow.has(f.id)) stats.failAllowed++;
    else {
      stats.failOutside++;
      outside.push(c.id);
      add('FAIL', c.id, 'C1-fail-not-in-allowlist',
        `FAIL \`${f.id}\` 不在 §9.15 允许表里 —— 契约 §7.2 要求「FAIL 集合 ⊆ 允许表」。` +
        `原话：${String(f.message || '').slice(0, 90)}`);
    }
  }
}

/* C5（2026-10-31 新增）：允许表里登记的规则，是否**可能**产生 FAIL
 *
 * 为什么必须加 —— 锐评验收打穿了 C1 的软肋：
 *
 *   §9.15 允许表 5 条里，`font-fallback`（rules.mjs:103）与 `measure`（rules.mjs:119）
 *   在规则引擎里**只有 `add('WARN', …)` 分支，根本没有 FAIL 分支**。
 *   它们永远不可能出现在 C1 的输入里。
 *
 *   剩下 3 条里，`mono` 在 30 案实测触发 0 次（monoProseShare 30/30 = 0）。
 *   所以今天真正参与 C1 判定的只有 S08 的 2 条规则，而这 2 条本来就是为 S08 登记的。
 *
 *   ⇒ 「C1 2/2 全绿」是**结构性**的，不是测出来的。这正是本仓库反复踩的恒真式陷阱。
 *
 * C5 把这个结构问题变成可判定的：读规则引擎源码，看每条允许规则有没有
 * `add('FAIL', '<rule>'` 这个字面。没有就是"登记了一条不可能 FAIL 的规则"，
 * 那条豁免在逻辑上是空转的。
 *
 * 严重度定 WARN 而不是 FAIL：登记它不造成错误结果，只是让允许表看起来比实际更有内容。
 * 但必须报出来 —— 否则下一个人会以为这 5 条都在起作用。 */
const engineSrc = existsSync(RULES) ? readFileSync(RULES, 'utf8') : '';
const canProduceFail = new Map();
if (engineSrc) {
  for (const rule of allow.keys()) {
    /* 匹配 add('FAIL', '<rule>' —— 引号可能是单或双 */
    const re = new RegExp(`add\\(\\s*['"]FAIL['"]\\s*,\\s*['"]${rule.replace(/[-]/g, '\\-')}['"]`);
    canProduceFail.set(rule, re.test(engineSrc));
  }
  const impossible = [...canProduceFail.entries()].filter(([, v]) => !v).map(([k]) => k);
  stats.allowImpossible = impossible.length;
  if (impossible.length) {
    add('WARN', '_CONTRACT.md §9.15', 'C5-allow-rule-cannot-fail',
      `${impossible.length}/${allow.size} 条登记规则在规则引擎里**没有 FAIL 分支**（只有 WARN），` +
      `永远不可能出现在 C1 的输入里: ${impossible.join(', ')}。` +
      `这些豁免在逻辑上是空转的 —— 不是"规则被修好了"，是"这条规则根本不会红"。` +
      `C1 的有效判定面因此只有 ${allow.size - impossible.length}/${allow.size} 条。`);
  } else stats.allowImpossible = 0;
} else {
  /* 引擎源码读不到时不能静默通过（§9.22：tools/ 会无声蒸发）。
   * 这是 C2 的 fail-open 缺陷，一并修：移走 rules.mjs 必须红，不是绿。 */
  add('FAIL', '_CONTRACT.md §9.15', 'C2-engine-missing',
    `读不到规则引擎源码（${RULES}）—— C2/C5 无法判定。` +
    `「无法判定」不等于「成立」；且 §9.22 记录过仓库外 tools/ 无声消失的真实事故。`);
}

/* C6：§9.15 里"像规则行但没解析出规则名"的行数 —— 防判据静默缩小
 *
 * 锐评实测：删掉一行规则名的反引号，允许表静默 5→4，C2 仍报 4/4 全绿。
 * 这不是"表变小了"这么简单 —— 它意味着 C1 会开始放过那条规则的真实 FAIL。 */
if (allow.__unparsed > 0) {
  stats.unparsedRows = allow.__unparsed;
  add('WARN', '_CONTRACT.md §9.15', 'C6-allow-rows-unparsed',
    `§9.15 有 ${allow.__unparsed} 行看起来是规则行，但没有解析出反引号规则名 —— ` +
    `允许表可能比实际写的更小，C1 会因此放过那些规则的真实 FAIL。` +
    `表格格式（规则名必须包在反引号里且位于第一列）是判据的一部分，不是排版细节。`);
}
stats.unparsedRows = stats.unparsedRows || 0;
delete allow.__unparsed;

/* C3：允许表登记但无案触发 —— INFO，不是失败 */
const unused = [...allow.keys()].filter((r) => !triggered.has(r));
if (unused.length) {
  add('INFO', '_CONTRACT.md §9.15', 'C3-allow-rule-unused',
    `${unused.length} 条登记规则当前没有任何案触发: ${unused.join(', ')}` +
    `（不是失败 —— 是审计线索：可能规则已修好、允许表该收窄）`);
}

/* C4（反向断言，2026-10-31 新增）：文档声称的 FAIL 是否与实测一致
 *
 * 为什么必须加它 —— 这是本闸门第一版的方向性错误。
 *
 * C1 守的是「**多出来**的 FAIL」（实测 FAIL 超出允许表）。但今天真正的问题
 * 恰恰相反：**文档写着有、实际没有**。两个现成例子：
 *
 *   · `_CONTRACT.md:110` 写「S13 的 17 处 shadow + button-fx 属真未修」，
 *     实测 S13 的 findings 里 shadow = 0、button-fx = 0。
 *     那 17 处是 CSS 源码里的静态计数（其中 8 处 inset 凹槽、6 处 none、
 *     1 处描边、1 处零值），工具只判外投影 ⇒ shadowStatic = 0。
 *   · `README-EN.md:425` 仍写「genuinely unresolved」，而中文版 README:425
 *     已经纠错过（"上一版 README 写的……是错的"）—— 两版漂移。
 *
 * C1 对这两例完全无反应，因为它们的 FAIL 集合是空集，而空集是任何集合的子集。
 *
 * 判据：从文档里抽「某案有 N 处/条/个 X 未清」这类硬声称，与实测 findings 比。
 * 为了让这条断言**可证伪而不是靠猜**，只认窄模式：案号 + 数字 + `shadow`/`button-fx`
 * 这两个具体规则名。抽不出就报 INFO（不是沉默通过）。
 */
const DOC_CLAIM_DOCS = [
  { path: join(ROOT, 'prototypes/_CONTRACT.md'), label: '_CONTRACT.md' },
  { path: join(ROOT, 'README.md'), label: 'README.md' },
  { path: join(ROOT, 'README-EN.md'), label: 'README-EN.md' },
];

/* 实测：每案的 FAIL 规则名集合 */
const actual = new Map();
for (const c of cases) {
  if (!c.fails) continue;
  actual.set(c.id, new Set(c.fails.map((f) => f.id)));
}

let c4Checked = 0;
for (const doc of DOC_CLAIM_DOCS) {
  if (!existsSync(doc.path)) continue;
  const text = readFileSync(doc.path, 'utf8');
  /* 模式：`S13` 的 17 处 `shadow`（中文）/ `S13`'s `shadow` (17 occurrences)（英文）。
   * 两个方向都要认：数字在规则名之前，或数字在规则名之后的括号里。
   *
   * ⚠️ 2026-10-31 第 2 轮放宽：复核 Agent 的绕过句里，案号与规则名之间可能夹
   * 破折号、分号、或较长的从句（例：「`S13` 的 17 处 `shadow` 属真未修——该规则…」）。
   * 原模式 `[^。.\n]{0,26}?` 在破折号后还有内容时会失败。放宽到 40 并允许 `—`。 */
  const CLAIM_RE = /\*{0,2}`?(S\d{2})`?(?:'s)?[^。.\n]{0,40}?(?:(?:(\d+)\s*(?:处|条|个)[^。.\n]{0,20}?`?(shadow|button-fx)`?)|(?:`?(shadow|button-fx)`?[^。.\n]{0,12}?\((\d+)\s*(?:occurrences?|instances?|处)\)))/g;
  for (const m of text.matchAll(CLAIM_RE)) {
    const id = m[1];
    const claimedN = parseInt(m[2] ?? m[5], 10);
    const rule = m[3] ?? m[4];
    const realSet = actual.get(id);
    if (!realSet || !rule) continue;
    const win = text.slice(Math.max(0, m.index - 150), m.index + 260);
    /* 「声称未清/未修」的语气 —— 这是 C4 的唯一输入门槛。
     *
     * ⚠️ 2026-10-31 修 bug（第 5 次，复核 Agent 的第 2 轮绕过暴露）：
     *
     * `isRetracted` 原本作用在 **±410 字符窗口**上。而 R2-3 那句
     *   「`S13` 的 17 处 `shadow` 属真未修——该规则从未被任何断言检测到**已清**。」
     * 里的「已清」被当成撤回词 ⇒ 整条跳过。但那句话是在说"从未被检测到已清"，
     * 意思是**还欠着**。
     *
     * 更糟的是 match 1（文档里真实的纠错记录）也在同一个窗口里，
     * 于是注入句和纠错句共享窗口互相干扰。
     *
     * 修法：撤回判定也改为**逐句**，且撤回词必须与案号/规则名在**同一句**里，
     * 且该句不能同时含欠款核心词。这样"已清账（复核）：S13 的 shadow 早已清"
     * 仍算撤回（它同时含"已清"与"已清账"但**不含"未修/未清"**），
     * 而"属真未修——…检测到已清"因为它含"未修"而不算撤回。 */
    const sentsForRetract = win.split(/[。！？\n]/).filter((s) => s.trim());
    const isClaimOpen = sentsForRetract.some((s) =>
      /真未修|未修|未清|genuinely unresolved|no exemption|不在.*允许表/.test(s));
    const CLAIM_CORE_EARLY = /真未修|未修|未清|genuinely unresolved|还欠|仍欠/;
    const RETRACT_WORDS = /是\*\*错的\*\*|是错的|已清账|已清|早就清|早已清|已修|was \*\*wrong\*\*|was wrong|cleared|no longer|不再欠/;
    /* 撤回判定分两级：
     *
     * ① **同句撤回**：撤回词 + 案号 + 规则名 + 不含欠款核心词，都在同一句。
     *    例：「已清账（复核）：`S13` 的 `shadow` 早已清」
     *
     * ② **跨句撤回**：文档明确在说"上一版这样写是错的"（"An earlier revision of this
     *    line said … which was wrong" / "上一版 README 写的是错的"）。这类纠错记录
     *    必然把旧说法与"是错的"分在两句里，只按同句判会把它误报成欠款。
     *    判据：窗口里同时出现「earlier revision / 上一版 / 此前写」+「wrong / 是错的」。
     *
     * ② 不能放宽成"窗口里只要出现 wrong 就算撤回"——那样真欠款句只要旁边有
     * 一个无关的"错误"字样就会被放过（复核 Agent 第 2 轮就是这么打穿的）。
     */
    const retractSentence = sentsForRetract.find((s) => {
      if (!RETRACT_WORDS.test(s)) return false;
      if (CLAIM_CORE_EARLY.test(s)) return false;
      if (!new RegExp(`S\\d{2}`).test(s)) return false;
      if (!new RegExp(rule, 'i').test(s)) return false;
      const idx2 = s.search(RETRACT_WORDS);
      const before2 = s.slice(Math.max(0, idx2 - 4), idx2);
      if (/未|没|不|从未|没有/.test(before2)) return false;
      return true;
    });
    /* 跨句纠错记录：文档自述"上一版这样写是错的" */
    const isExplicitSelfCorrection =
      /earlier revision|上一版|此前写|previous version|从前写/i.test(win) &&
      /（是\*\*错的\*\*|是错的|was \*\*wrong\*\*|was wrong|was stale|已过期）/i.test(win);
    const isRetracted = Boolean(retractSentence) || isExplicitSelfCorrection;
    /* ⚠️ 2026-10-31 修 bug（第 3 次，终验 Agent 打穿）：
     *
     * 上一版 isMeta 是一串词的 OR：
     *   「为什么需要 | 检查器 | 断言 | 闸门 | 抓到 | 实测 0 条 | 这条断言 | C1-5 | check- 前缀」
     * 只要窗口（±410 字符）里**出现任意一个词**就放过。
     *
     * 终验构造了 9 条**真的在声称欠款**的句子，每条只嵌一个元词，
     * **9/9 全部漏报**。对照：同句只加「人工检查器」五个字，就从「抓到」翻成「放过」。
     * ab-c4 的 4 个变异都没嵌元词 —— 测试盲区保护了这个缺陷。
     *
     * 修法：从"词表 OR"改成**结构判据**——必须「元语境主语 + 工具动作」
     * 落在**同一个句子**里，而不是整个 ±410 字符窗口。
     *
     * 主语：本闸门／这条断言／检查器／C1-6／该规则／这个工具／check-*
     * 动作：抓到／报出／检测到／发现／上线当天／会红／报 WARN／拦下／据此
     *
     * 这样「文档在替 S13 要豁免」这种真声称（没有工具作主语）不会被放过；
     * 而「C4 当天抓到两处…」这种元描述（主语+动作都在）会被正确放过。 */
    const sentences = win.split(/[。！？\n]/).filter((s) => s.trim());
    /* ⚠️ 2026-10-31 修 bug（第 4 次，复核 Agent 打穿）：
     *
     * 上一版判据是「元语境主语 + 工具动作落在同一句」就放过。复核构造了 4 条
     * **同时是元描述又是真欠款**的句子，4/4 全部漏报：
     *
     *   「这个工具至今没有发现：`S13` 的 17 处 `shadow` 属真未修。」
     *   「检查器没有报出 `S13` 的 17 处 `shadow` 属真未修，所以它还欠着。」
     *   「`S13` 的 17 处 `shadow` 属真未修——该规则从未被任何断言检测到已清。」
     *   「`S13` 的 17 处 `shadow` 属真未修；这个工具只会据此放行，不会修它。」
     *
     * 这 4 句的主语是工具、动作也是工具动作，但它们**确确实实在声称欠款**。
     * 判据把前者当放过理由，就把后者一起丢掉了。
     *
     * 修法：元描述只有在**该句不含欠款主张**时才成立。即 "元描述 AND NOT 含欠款"。
     * 更准确地说：元描述句若自身就带着「属真未修 / 未清」这类断言，它就是欠款声称，
     * 不能因为有工具主语而豁免。
     *
     * 这样「C4 上线当天抓到两处…（实测 0 条）」仍是元描述（它说的是"抓到"，
     * 不是在断言"还欠着"），而上面 4 句会被抓住。 */
    const CLAIM_CORE = /真未修|未修|未清|genuinely unresolved|还欠|仍欠/;
    const isMeta = sentences.some((s) => {
      const hasSubject = /本闸门|这条断言|检查器|check-contract|check-twolines|C[1-6]\b|该规则|这个工具/.test(s);
      const hasAction = /抓到|报出|检测到|发现|上线当天|会红|报\s*WARN|拦下|据此/.test(s);
      /* 否定式的工具动作 —— "工具没发现/没报出/从未检测到"都是在声称欠款。
       * 2026-10-31 第 2 轮补：`从未被任何断言检测到已清` 这类被动式也要认。 */
      const negatedAction = /没有?发现|未发现|没报出|未报出|从未.{0,12}(检测|发现|报|清)|不报|只会据此放行|未被.{0,6}检测/.test(s);
      return hasSubject && hasAction && !CLAIM_CORE.test(s) && !negatedAction;
    });
    if (!isClaimOpen || isRetracted || isMeta) continue;
    c4Checked++;
    const realN = realSet.has(rule) ? 1 : 0;
    if (claimedN > 0 && realN === 0) {
      add('FAIL', id, 'C4-doc-claims-fail-that-is-gone',
        `${doc.label} 声称 ${id} 有 ${claimedN} 处 \`${rule}\` 属未修/未清，但实测该案 findings 里 ` +
        `\`${rule}\` = 0 条。引用跳空：文档在替一个已经不存在的缺陷要豁免。` +
        `原文附近：「${win.replace(/\s+/g, ' ').slice(0, 110)}…」`);
    }
  }
}
if (!c4Checked) {
  add('INFO', 'docs', 'C4-no-claims-found',
    '三份文档里没有抽取到「某案有 N 处 X 未清」这类硬声称，C4 本次无输入 ' +
    '（不是失败：可能文档措辞变了，值得人工确认 C4 的窄模式是否需要放宽）');
}

/* ── 输出 ──────────────────────────────────────────────────────────────── */
const FAILS = findings.filter((f) => f.level === 'FAIL');
const WARNS = findings.filter((f) => f.level === 'WARN');
const INFOS = findings.filter((f) => f.level === 'INFO');
stats.fail = FAILS.length;
stats.warn = WARNS.length;
stats.info = INFOS.length;

if (JSON_OUT) {
  console.log(JSON.stringify({ stats, findings }, null, 2));
} else {
  console.log(`契约一致性闸门：§9.15 允许表(${stats.allowRules} 条) vs 30 案实测 FAIL`);
  console.log('  查的是「FAIL ⊆ 允许表」（契约 §7.2），不是「FAIL = 0」');
  console.log('');
  console.log(`  C1 FAIL 全在允许表内        ${stats.failAllowed}/${stats.failTotal}`);
  if (stats.engineRules !== null) {
    const bad = [...allow.keys()].filter((r) => !engine.has(r)).length;
    console.log(`  C2 允许表的规则引擎里都存在  ${stats.allowRules - bad}/${stats.allowRules}`);
  } else {
    console.log(`  C2 允许表的规则引擎里都存在  ?  （引擎不可读）`);
  }
  console.log(`  C3 登记但无案触发（INFO）    ${unused.length} 条`);
  /* C4/C5/C6 的结果必须打印 —— 2026-10-31 终验指出：
   * 交付说明里贴了这三行的输出，而程序**从来没有打印过它们**。
   * 一个闸门不打印自己的判定，等于让人只能从 exit code 猜。 */
  console.log(`  C4 文档声称 vs 实测           ${c4Checked} 处声称被核，${FAILS.filter((f) => /^C4-/.test(f.rule)).length} 处矛盾`);
  if (stats.engineRules !== null) {
    console.log(`  C5 登记规则的 FAIL 分支       ${allow.size - stats.allowImpossible}/${allow.size} 条可能产生 FAIL`);
  } else {
    console.log(`  C5 登记规则的 FAIL 分支       ?  （引擎不可读）`);
  }
  console.log(`  C6 未解析的规则行             ${stats.unparsedRows} 行`);
  console.log('');

  if (!QUIET || FAILS.length) {
    const byRule = new Map();
    for (const f of findings) {
      const k = `${f.level}|${f.rule}`;
      if (!byRule.has(k)) byRule.set(k, []);
      byRule.get(k).push(f);
    }
    for (const [k, list] of [...byRule.entries()].sort()) {
      const [level, rule] = k.split('|');
      if (QUIET && level !== 'FAIL') continue;
      const mark = level === 'FAIL' ? '✗' : level === 'WARN' ? '~' : '·';
      console.log(`${mark} [${rule}] ${list.length} 条`);
      for (const f of list.slice(0, QUIET ? 3 : 20)) console.log(`    ${f.scope}  ${f.msg}`);
      if (list.length > (QUIET ? 3 : 20)) console.log(`    … 其余 ${list.length - (QUIET ? 3 : 20)} 条同规则`);
    }
    console.log('');
  }

  console.log(`合计 FAIL ${stats.fail} / WARN ${stats.warn} / INFO ${stats.info}`);
}

process.exit(FAILS.length ? 1 : 0);
