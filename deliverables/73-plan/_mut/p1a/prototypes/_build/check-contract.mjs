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
// 按本仓库 §7.4 自己的定义，那是 bug（引用跳空）。补了那一行之后引用才为真，
// 但**没有任何机制保证它下次不会再跳空**。本闸门就是那个机制。
//
// 查的是什么（三件事，都可证伪）
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
  for (const line of sec.split(/\r?\n/)) {
    const m = line.match(/^\|\s*`([\w-]+)`\s*\|/);
    if (!m) continue;
    const cells = line.split('|').map((c) => c.trim());
    rows.set(m[1], { rule: m[1], why: cells[2] || '', how: cells[3] || '' });
  }
  if (!rows.size) throw new Error('§9.15 允许表解析出 0 条规则 —— 表格格式变了？');
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

/* C3：允许表登记但无案触发 —— INFO，不是失败 */
const unused = [...allow.keys()].filter((r) => !triggered.has(r));
if (unused.length) {
  add('INFO', '_CONTRACT.md §9.15', 'C3-allow-rule-unused',
    `${unused.length} 条登记规则当前没有任何案触发: ${unused.join(', ')}` +
    `（不是失败 —— 是审计线索：可能规则已修好、允许表该收窄）`);
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
