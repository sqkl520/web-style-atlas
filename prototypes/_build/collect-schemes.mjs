#!/usr/bin/env node
// 为选型台收集 30 个方案的展示数据。
//
// 数据来源刻意分三层，优先级从高到低：
//   1. prototypes/_specs/_CURRENT-VALUES.md —— **当前有效**的背景/主色/按钮字色/错误码（权威）
//   2. prototypes/_specs/Sxx.md —— 12 字段正文（是修正前原文，只用于取描述性文字）
//   3. prototypes/<dir>/.inspect/report.json —— 闸门结果、屏数、真实图片数、截图清单
// 为什么不只读 _specs：字段 3 的配色是修正前的；S04 的旧主色 #E8871E 就是被终局轮改掉的。
//
//   node collect-schemes.mjs          # 写 prototypes/_selection/data.js
//   node collect-schemes.mjs --check  # 只看解析结果，不写盘
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// 仓库根由脚本自身位置推得（模板 = check-stale.mjs:16；含 Windows 盘符修正与 39 §3-N10 的 decodeURIComponent）。
const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const PROTO = join(ROOT, 'prototypes');
const SPECS = join(PROTO, '_specs');
const OUTDIR = join(PROTO, '_selection');
const check = process.argv.includes('--check');

const dec = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
const hexes = (s) => [...new Set([...String(s).matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) => m[0].toUpperCase()))];

/* ── 字段 8 的「评审工件」切断（2026-10-27；裁决依据 deliverables/65-plan/VERDICT-audit-plumbing.md §3.3）──
 *
 * 症状：S13 的字段 8（→ `audit`）全长 780 字，其中**前 307 字是正文**
 * （「第一，反 C-2.11…第二…第三…第四，反 C-4 与 R-28…」），
 * **后 473 字（60.6%）是混进来的评审清单**：
 *   「反套路改造三指标（对齐 02 号文件 8.3 节，供 V-11 / R-40 逐条打勾） -
 *    必须存在 X… - 必须不存在 Y… - 必须可测量 Z…」
 * 它自己写着「供 V-11 / R-40 逐条打勾」—— 那是给评审员逐条打勾的工件，
 * 不是给选型用户看的方案内容。原样摊出来，等于把内部检查表当成风格说明。
 *
 * 为什么会混进来：下面的字段切分只把「**加粗编号**」（`**1 一句话视觉定义**`）当作字段起点，
 * S13.md:37 的「**反套路改造三指标（…）**」是**不带编号**的加粗小节，于是没被识别为起点，
 * 整段被并进了上一个字段（字段 8）。同一个机制在 S14/S15/S16/S17/S20 的 `layout` 上也有
 * （无编号加粗小节紧跟其后，合计 6 处）。**那 5 处本轮不动**：修切分器会让 layout 五案
 * 合计减 2,426 字（S14 −648/−364、S15 −396/−183、S16 −330、S17 −190、S20 −315），
 * 撞碎字节验收线且要重跑全部闸门，裁决 §3.4 明确放弃、另立 P3 待办。这里**只切 audit**。
 *
 * 切在哪一层：**数据层，就在赋值处**（`audit: cutAuditMarker(...)`）。
 * 上一轮只在 UI 层切（`prototypes/_selection/app.js` 的 `AUDIT_CUT_AT` + `auditText()`），
 * 后果是 `data.js` 至今仍是脏的 —— 任何未来的消费者（导出功能、API、第二个 UI）都会拿到污染。
 * 「只有这一条路径是干净的」不是修好，是打补丁；数据层的债要在数据层还。
 * ⚠️ 于是 UI 层那份切分现在是**重复逻辑**：`app.js` 的 `var AUDIT_CUT_AT = { S13: '反套路改造三指标' };`
 *    与 `auditText()` 里的 `indexOf` 切片，数据层修好后**应当由面板负责人删除**
 *    （本文件不能改 app.js：并发工作区，本轮写作用域只有 collect-schemes.mjs 与它的产物）。
 *
 * 为什么**按标记**切、不按案号：`indexOf('反套路改造三指标')` 对全部 30 案一律成立，
 * 将来若别的案也出现这个标记，自动生效；按案号的白名单不会。
 * 实测分布（deliverables/65-exec/_cut/scan-marker.mjs，2026-10-27）：
 *   · data.js 30 案 × 33 键全扫：命中 6 处，**全部落在 S13.audit 这一个字段里**（无第二例）；
 *   · _specs/Sxx.md 原文：命中 10 处。其中 S03.md:21 与 S08.md:21 写作独立的
 *     `3-附（反套路改造三指标）：…` 行 ⇒ 键被括号正则剥空 ⇒ 那两段在 collect 阶段**整段丢弃**，
 *     从未进 data.js；S13.md:37–40 就是这 473 字；S13.md:57 在「自评」之后，被 tailRe 截断，也没进。
 *   所以「按标记切」当前等价于「只切 S13 一案」，但语义更强：它切的是**工件形状**，不是案号。
 *
 * 为什么不会误伤：标记串只在 `audit:` 的赋值处调用；且要求 `indexOf > 0` ——
 * 若标记出现在第 0 位（说明字段解析已错位到把工件当正文），宁可留着让人看见，也不静默清空。
 *
 * 边界与实测：`indexOf === 307`；head 的末字符正是切分点前那个分隔空格（`…三个数。␣反套路…`）。
 * 不 trim 会留下 307 字的尾空格串，而全库另 29 案的 audit **没有一个**以空白开头或结尾
 * （deliverables/65-exec/_cut/ws-probe.mjs 实测），故 trimEnd。
 * 切后 S13 = **306 字**；30 案 audit 合计 **10,539 → 10,065 字**（10539 − 780 + 306）。
 * 其余 29 案 audit 的 sha256 逐案不变，对比表在 deliverables/65-exec/EXEC-data-cut.md。 */
const AUDIT_CUT_MARK = '反套路改造三指标';
const AUDIT_CUT_LOG = [];
function cutAuditMarker(id, raw) {
  const v = String(raw || '');
  const i = v.indexOf(AUDIT_CUT_MARK);
  if (i > 0) {
    const kept = v.slice(0, i).trimEnd();
    AUDIT_CUT_LOG.push({ id, before: v.length, after: kept.length, at: i });
    return kept;
  }
  return v;
}

/* ── 样式面：一个 hex 到底有没有被真的用上 ────────────────────────────────
 * 这是任务 A 的第二道判据（比否定词表更硬）：**规格说有、但样式面里一次都没出现的颜色，不进调色板**。
 * 为什么不能只看 style.css：契约允许个别方案的色来自 index.html 的内联 <style> / style="…" /
 * 内联 SVG 的 fill・stroke，以及 assets/*.svg（程序化生成的纹理与图形）。
 * 为什么不能直接扫 index.html 全文：S28 的 `#EC4899` 确实在 index.html 里出现 1 次 ——
 * 但那是在 <p> 正文里（"离开 #EC4899 42°"），是**讲反例的散文**，不是渲染面。
 * 全文件扫会把它当"落地了"保下来，等于白改。所以只认样式面：
 *   style.css 全文 ∪ index.html 的 <style> 块 ∪ style="…" 属性 ∪ SVG 表现属性 ∪ assets/*.svg。
 * 实测依据（deliverables/99-scratch/audit-palette-where.mjs）：
 *   30 案 118 个 palette 项里，只有 S02 #22D3EE / S12 #0F172A / S17 #111111 / S28 #EC4899
 *   在样式面里 0 次，其余全部 ≥1 次（其中 4 项靠 index.html 的 style 属性/SVG 属性命中，
 *   若只扫 style.css 会误杀）。 */
const styleCache = new Map();
function styleSurface(dir) {
  if (!dir) return '';
  if (styleCache.has(dir)) return styleCache.get(dir);
  const parts = [];
  const css = join(PROTO, dir, 'style.css');
  if (existsSync(css)) parts.push(readFileSync(css, 'utf8'));
  const html = join(PROTO, dir, 'index.html');
  if (existsSync(html)) {
    const t = readFileSync(html, 'utf8');
    for (const m of t.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) parts.push(m[1]);
    for (const m of t.matchAll(/\bstyle\s*=\s*"([^"]*)"/gi)) parts.push(m[1]);
    for (const m of t.matchAll(/\bstyle\s*=\s*'([^']*)'/gi)) parts.push(m[1]);
    for (const m of t.matchAll(/\b(?:fill|stroke|stop-color|flood-color|color|lighting-color)\s*=\s*["']([^"']*)["']/gi)) parts.push(m[1]);
  }
  const ad = join(PROTO, dir, 'assets');
  if (existsSync(ad)) {
    for (const f of readdirSync(ad)) if (/\.svg$/i.test(f)) parts.push(readFileSync(join(ad, f), 'utf8'));
  }
  const s = parts.join('\n');
  styleCache.set(dir, s);
  return s;
}
const inStyle = (dir, h) => new RegExp(h + '(?![0-9A-Fa-f])', 'i').test(styleSurface(dir));
// 剔除日志：脚本跑完要能逐条说出「哪个色、因为什么被剔除」，这是本轮的验收证据。
const PAL_DROPPED = [];

// ---- 1 解析 _CURRENT-VALUES.md 的逐案表 ----
const cur = {};
{
  const t = readFileSync(join(SPECS, '_CURRENT-VALUES.md'), 'utf8');
  for (const line of t.split(/\r?\n/)) {
    const m = /^\|\s*\*\*(S\d{2})\*\*\s*([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|/.exec(line);
    if (!m) continue;
    const [, id, cn, bgCell, primaryCell, , btnCell, errCell] = m;
    const bg = hexes(bgCell)[0] || null;
    const primary = hexes(primaryCell)[0] || null;
    let buttonText = null;
    if (/白字/i.test(btnCell)) buttonText = '#FFFFFF';
    else buttonText = hexes(btnCell)[0] || null;
    const codeM = /([A-Z][A-Z0-9]{1,12}-\d{1,4})/.exec(errCell) || /([A-Z][A-Z0-9]{1,12}-\d{1,4})/.exec(m[4]) || null;
    cur[id] = { cn: dec(cn), bg, primary, buttonText, errorCode: codeM ? codeM[1] : null };
  }
}
console.log(`_CURRENT-VALUES.md 解析出 ${Object.keys(cur).length} 案`);

// ---- 1c 解析 §2 的「旧值 → 新值」替换表，建"作废色"黑名单 ----
// 为什么必须有它：字段 3 是**修正前**的原文，里面还写着旧主色（S22 的 #666D51、S27 的 #0E7264），
// 而且旧值旁边**照样有"主色"这个角色标签**，所以靠角色+否定语境都挡不住。
// `_CURRENT-VALUES.md` §2 那张表是权威的"哪些值已作废"，直接拿它当黑名单。
const stale = {};
{
  const t = readFileSync(join(SPECS, '_CURRENT-VALUES.md'), 'utf8');
  const sec = t.split(/^## 2 /m)[1] || '';
  for (const line of sec.split(/\r?\n/)) {
    const m = /^\|\s*(S\d{2})\s*\|([^|]*)\|([^|]*)\|([^|]*)\|/.exec(line);
    if (!m) continue;
    const oldCell = m[3];                                        // 第 3 格＝旧值
    const hs = hexes(oldCell);
    if (hs.length) stale[m[1]] = (stale[m[1]] || []).concat(hs);
  }
}
console.log(`§2 旧值黑名单：${Object.keys(stale).length} 案，共 ${Object.values(stale).reduce((a,b)=>a+b.length,0)} 个作废色`);

// ---- 1b 解析 §4 的 Lead 补入错误码表（S21–S30 的源文件里没有，见该节说明）----
const leadCodes = {};
{
  const t = readFileSync(join(SPECS, '_CURRENT-VALUES.md'), 'utf8');
  const sec = t.split(/^## 4 /m)[1] || '';
  for (const line of sec.split(/\r?\n/)) {
    const m = /^\|\s*(S\d{2})[^|]*\|[^|]*`([A-Z][A-Z0-9]{0,12}-[A-Z]{0,2}\d{1,4})`/.exec(line);
    if (m) leadCodes[m[1]] = m[2];
  }
}
console.log(`§4 Lead 补入错误码 ${Object.keys(leadCodes).length} 条（${Object.keys(leadCodes).join(' ')}）`);

// ---- 2 解析每个单案规格 ----
/* FIELDS 是「规格里应当有哪 13 项」的清单，**不是**「下面都赋了值」的保证。
 * 2026-10-27 复核：清单 13 项里，赋值表只覆盖 11 项 + landing + audit。
 * 唯一没有赋值的是第 2 项「机制」——而它**不是漏了，是走了另一条路**，别再来"修"：
 *
 *   · 规格里根本没有一个叫「机制」的字段标题。实测扫描 30 份 md 的字段起点，
 *     出现的 key 只有这 12 个：一句话视觉定义／美学家族与参考／配色系统／字体策略／
 *     布局与网格／关键视觉元素／动效与交互／去 AI 味审查点／反 AI 味风险与规避／
 *     适用场景／可落地要点／设计师签名式怪癖，外加 12 处**空 key**。
 *     「key 恰好等于 机制」的出现次数 = 0（复算脚本 deliverables/65-exec/_allkeys.mjs）。
 *   · 「机制」的真身是 `1-附（去掉名字之后的机制）：` —— 剥掉括号说明后 key 是空串，
 *     所以它命中不了 fields['机制']，也不需要命中。
 *   · 这 12 处空 key = 10 处 `1-附`（S01–S10）+ 2 处 `3-附（反套路改造三指标）`（S03、S08）。
 *     S11–S30 的 md **完全没有 1-附 这一行**（实测 0/20），机制句是后来补的。
 *   · 真正的消费链是：prototypes/_prompts/extract-dna.mjs:101 自己用
 *     `/1-附（去掉名字之后的机制）[：:]\s*([^\n]+)/` 从 md 直接抓 → dna-clean.json（10/30）
 *     → build-prompts.mjs 再用 mechanisms.mjs 补 S11–S30 的 20 条 → prompts.js 30/30、共 2613 字。
 *     实测：prompts.js 里 S01–S10 的机制句与各自 md 的 1-附 **逐字相同 10/10**。
 *
 * 为什么不能在这里也读一遍：那会让 data.js 也带一份机制句（只有 10/30，S11–S30 是空的），
 * 同一个概念就此有两个来源、且其中一个天生残缺 20 案。下一个读 data.js 的人会以为
 * S11–S30 没有机制句，进而去 md 里"补"，而 mechanisms.mjs 已经补过 —— 这就是分叉。
 * 要动机制句，改 mechanisms.mjs（它自己写了判据与行号来源），不要动这里。 */
const FIELDS = ['一句话视觉定义', '机制', '美学家族与参考', '配色系统', '字体策略', '布局与网格', '关键视觉元素', '动效与交互', '去 AI 味审查点', '反 AI 味风险与规避', '适用场景', '可落地要点', '设计师签名式怪癖'];
function parseSpec(id) {
  const p = join(SPECS, id + '.md');
  if (!existsSync(p)) return null;
  const text = readFileSync(p, 'utf8');
  // 标题在 `> 原标题：方案 N｜中文名（English Name）` 里（块引用），不是 ### 标题
  const titleM = /^>\s*原标题：\s*方案\s*\d+\s*[｜|]\s*(.+)$/m.exec(text)
    || /^###\s*方案\s*\d+\s*[｜|]\s*(.+)$/m.exec(text);
  let cn = '', en = '';
  if (titleM) {
    const t = titleM[1].replace(/\[高危改造\]/g, '').trim();
    const em = /^(.*?)（([^）]+)）\s*$/.exec(t);
    if (em) { cn = em[1].trim(); en = em[2].trim(); } else cn = t;
  }
  const metaM = /\*\*结构类型\*\*：\s*([^\n｜|]+)[｜|]\s*\*\*认知门槛\*\*：\s*([^\n｜|]+)[｜|]\s*\*\*调性\*\*：\s*([^\n]+)/.exec(text);
  let fr = '', structure = '', threshold = '', tone = '';
  if (metaM) {
    const s = metaM[1].trim();
    fr = /^R/.test(s) ? 'R' : /^F/.test(s) ? 'F' : '';
    structure = (/[（(]([^）)]+)[）)]/.exec(s) || [, s])[1].trim();
    threshold = metaM[2].trim();
    tone = metaM[3].replace(/[｜|].*$/, '').trim();
  }

  // 字段标题有**三种书写惯例**，都要认：
  //   A（S01–S10）  1. 一句话视觉定义：正文（同一行）
  //   B（S11–S20）  **1. 一句话视觉定义**\n正文（标题整行加粗独占一行）
  //   C（S21–S30）  1. **一句话视觉定义**：正文（字段名加粗、冒号在其后）
  const starts = [];
  /* 2026-10-27 修：「8 栏，基线 6px…不对称方式：」被当成了字段标题，S12/S15/S19 的布局整段蒸发。
   *
   * 病相：字段 5「布局与网格」在 data.js 里是空串，30 案只有这 3 案空，其余 27 案正常。
   * 根因不在 md 里（三份 md 的字段 5 都写得完整，S12「8 栏，基线 6px（对齐街机像素栅格）…」），
   * 而在**下面这条 A 惯例正则**开了个口子：`[.．]?` 是可选的，于是
   *   `8 栏，基线 6px（对齐街机像素栅格），栏间距 0。不对称方式：`
   * 整行被读成「字段 8，名字=栏，基线 6px…不对称方式」。它是**字段段正文的第一句**，位置在
   * `**5. 布局与网格**` 之后 1 字节处，于是字段 5 的段落被切到 length 0，正文反倒挂到了一个
   * 不存在的字段名下（fields["栏，基线…"]，谁都不读）。
   *
   * 为什么恰好是这 3 案：正文第一句必须**以数字开头**才会被 A 正则的 `^\d{1,2}` 咬住。
   * 实测扫描全库 30 案：A 正则命中 135 处，其中「数字后面既没有点也没有 -附」的只有 3 处，
   * 就是 S12 / S15 / S19 这三行（复算脚本 deliverables/65-exec/_sep-scan.mjs）。
   * 其余 27 案的字段标题都带 `1.` 或 `-附`，不受影响。
   * 注：S15 是 `12 栏，…`、S19 是 `12 栏，…`（两位数），S12 是 `8 栏，…`（一位数），
   * 所以 `\d{1,2}` 改成 `\d` 也治不了，只能收掉「分隔符可选」这个口子。
   *
   * 修法：把分隔符**改成必需**——`-附` 或 `.`／`．` 至少出现一个。
   * 为什么不是「名字必须在 FIELDS 白名单里」：`-附` 那一路的 key 剥掉括号后是空串
   * （`1-附（去掉名字之后的机制）`），白名单会把 10 案的机制句起点全挡掉，
   * 那 10 案的字段 1 又会把机制句吞回去。
   * ⚠️ 上一版就在这里翻过车：当初把 [.．] 写成必需，`1-附（…）：` 因为 1 后面没有点而
   * 没被认成起点，机制句被并进字段 1，选型台的「一句话视觉定义」后面拖着一串
   * 「1-附（…）：一块实色多边形…」。所以这里**只能收「一个分隔符都不带」的口子**，
   * 不能反过来要求「必须有点」—— `-附` 与 `.` 是并列的两种合法分隔符，缺一不可。
   * 分隔符必需只挡「裸露的数字开头行」，不碰任何合法标题。
   * 加 `[^\n：*\d]` 开头保护仍然保留：否则 "2026 年 3 月：" 这类行会被误认成字段 "20"。 */
  const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附|[.．])\\s*' + NAME + '：', 'gm'))) {
    starts.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  }
  for (const m of text.matchAll(new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '\\*\\*\\s*$', 'gm'))) {
    starts.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  }
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*' + NAME + '\\*\\*\\s*[：:]', 'gm'))) {
    starts.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  }
  starts.sort((a, b) => a.i - b.i);
  // 字段区之后的收尾段落，任何一个出现都表示字段区结束
  const tailRe = /^\s*(?:\*\*)?(?:真实上站文案|自评|版本|校验|审查)(?:\*\*)?\s*[：:]/m;
  const tailM = tailRe.exec(text.slice(starts.length ? starts[0].i : 0));
  const tailAbs = tailM && starts.length ? starts[0].i + tailM.index : text.length;
  const fields = {};
  for (let i = 0; i < starts.length; i++) {
    const key = starts[i].key.replace(/（[^）]*）/g, '').trim();
    let to = i + 1 < starts.length ? starts[i + 1].i : tailAbs;
    if (to > tailAbs) to = tailAbs;
    const seg = text.slice(starts[i].end, to);
    if (key && !fields[key]) fields[key] = dec(seg);
  }
  // 文案的标签有**三种**，且 S21–S30 把它折进了字段 10 里（"上站文案三处：主张句…按钮…空状态…"）：
  //   S01–S10  真实上站文案：主张句"…"；按钮"…"；空状态"…"；错误状态"…"
  //   S11–S20  **可直接上线的文案**：主张句「…」；按钮「…」；空状态「…」；错误状态「…（错误码 X）」
  //   S21–S30  字段 10 里的"上站文案三处：主张句"…"按钮"…"空状态"…"——**没有错误状态那一条**
  const copyM = /(?:真实上站文案|可直接上线的文案|上站文案三处)\*{0,2}\s*[：:]\s*([\s\S]*?)(?=(?:\n\s*(?:\*\*)?(?:自评|版本|校验|审查))|不适合|\n---|$)/m.exec(text);
  const copy = copyM ? dec(copyM[1]) : '';
  // 把文案拆成四段，便于选型台逐条展示。"错误状态"在 S21–S30 里根本不存在，会留空。
  const part = (label) => {
    const re = new RegExp(label + '\\s*[：:]?\\s*[「"\']([^」"\']+)[」"\']');
    const m = re.exec(copy);
    return m ? m[1].trim() : '';
  };
  const copyParts = {
    claim: part('主张句'),
    button: part('按钮'),
    empty: part('空状态'),
    error: part('错误状态'),
  };
  // 错误码形状不止一种：P-03 / E-114 / BOOK-409 / SCAN-E114 / IMG-12-3。
  // 注意 [A-Z][A-Z0-9]{1,12} 会漏掉单字母前缀（P-03），必须用 {0,12}。
  const CODE = '([A-Z][A-Z0-9]{0,12}-[A-Z]{0,2}\\d{1,4}(?:-\\d{1,3})?)';
  const errFromCopy = new RegExp('错误码[\\s：:]*' + CODE).exec(copy)
    || new RegExp('错误码[\\s：:]*' + CODE).exec(text);
  // 主色兜底：_CURRENT-VALUES.md 有 17 案写的是"见 _specs/Sxx.md"，
  // 那些案必须回字段 3 去认。
  //
  // ⚠️ 2026-10-30 重写。旧实现是三正则并联、谁先命中谁赢：
  //
  //     const primM = /主色[^#\n]{0,24}(#[0-9A-Fa-f]{6})/.exec(p3raw)
  //       || /(#[0-9A-Fa-f]{6})[^#\n]{0,24}主色/.exec(p3raw)
  //       || /主色[\s\S]{0,40}?(#[0-9A-Fa-f]{6})/.exec(p3raw);
  //
  // 实测 5/30 案抽错（S02 抽到象牙纸白、S05 抽到面板灰米、S07 抽到油墨黑、
  // S09 抽到炭黑、S10 抽到全案面积最小的 5% 色）。根因有两个：
  //   ① 「#XXXXXX ... 主色 ...」这条会把**后面**句子的主色算给前面的 hex
  //   ② 字段 3 后面还有「反的是 `#6366F1` 靛蓝主色」这种否定语境，含"主色"二字
  //
  // 批判 Agent 实测：单纯调换 A/B 顺序会把正确率从 25/30 打到 **16/30**
  // （B 会命中否定语境，17 案拿到 #6366F1）。所以必须**先切分句、再排否定语境**：
  //
  // 正确做法：按 ；。换行 切分句 → 只留含「主色」且不含否定词的分句 → 取该分句
  // 里「主色」前后最近的 hex。实测 30/30。
  const NEG_CTX = /(反的是|反\s|不采用|修正前|不是|禁止|不新增|旧值|避免|不用)/;
  const p3raw = fields['配色系统'] || '';
  const primaryFromSpec = (function () {
    for (const seg of String(p3raw).split(/[；。\n]/)) {
      if (!/主色/.test(seg)) continue;
      if (NEG_CTX.test(seg)) continue;
      // 该分句里第一个 hex：字段 3 的写法是「主色 `#XXXXXX` 名字＝主色…」
      // ⚠️ 要带 `#` 前缀返回 —— `data.js` 的 `primary` 字段全库都带 `#`，
      // 这里少了它，`check-twolines` 的字符串比较会把 17 案全判成不匹配。
      const m = seg.match(/#([0-9A-Fa-f]{6})(?![0-9A-Fa-f])/);
      if (m) return m[0].toUpperCase();
    }
    return null;
  })();
  // 按钮字色兜底：字段 3 里明写"白字／#FFFFFF 作按钮底"的，取之
  const btnM = /按钮[\s\S]{0,40}?(?:白字|#FFFFFF)/.exec(p3raw);
  const buttonFromSpec = btnM ? '#FFFFFF' : null;
  return { cn, en, fr, structure, threshold, tone, fields, copy, copyParts, errorFromCopy: errFromCopy ? errFromCopy[1] : null, primaryFromSpec, buttonFromSpec };
}

// ---- 3 扫原型目录 ----
const dirs = readdirSync(PROTO, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();
const byId = new Map(dirs.map((d) => [d.slice(0, 3), d]));

const out = [];
for (let i = 1; i <= 30; i++) {
  const id = 'S' + String(i).padStart(2, '0');
  const dir = byId.get(id) || null;
  const spec = parseSpec(id);
  const c = cur[id] || {};
  const rec = {
    id, dir,
    cn: spec ? spec.cn : (c.cn || ''),
    en: spec ? spec.en : '',
    fr: spec ? spec.fr : '', structure: spec ? spec.structure : '',
    threshold: spec ? spec.threshold : '', tone: spec ? spec.tone : '',
    def: spec && spec.fields['一句话视觉定义'] ? spec.fields['一句话视觉定义'] : '',
    family: spec && spec.fields['美学家族与参考'] ? spec.fields['美学家族与参考'] : '',
    /* 2026-10-31 改名 `fonts` → `fontsSpec`。
     *
     * 为什么改：这个仓库有两条链，各自有一个叫 `fonts` 的字段，**形状完全不同**：
     *   · 这里（data.js）    `fontsSpec` = 规格字段 4 的**原文**，一个字符串
     *                        （30 案实测 min 228 / 中位 360.5 / max 514 / 均值 373 字）
     *   · prompts.js         `dna.fonts` = {display, body, mono, displayStack, bodyStack} 对象
     * 同名不同形状，读代码的人会以为是同一个东西，进而写出 `d.fonst.display` 这类
     * 在 data.js 侧永远 undefined 的代码（实测 `prompt-copy.js:180` 就留着一段
     * 「万一 fonts 是数组」的兼容分支，而两条链都不再产生数组）。
     *
     * 改名的代价很小：消费方只有 2 处（app.js 的搜索索引与字段展示），
     * 而且两处都是**原样使用字符串**，不依赖字段名以外的语义。
     * 保留旧名 `fonts` 一并输出是错的——那等于让两个名字继续并存，
     * 问题原封不动。所以是**替换**，不是新增。 */
    fontsSpec: spec && spec.fields['字体策略'] ? spec.fields['字体策略'] : '',
    layout: spec && spec.fields['布局与网格'] ? spec.fields['布局与网格'] : '',
    visuals: spec && spec.fields['关键视觉元素'] ? spec.fields['关键视觉元素'] : '',
    motion: spec && spec.fields['动效与交互'] ? spec.fields['动效与交互'] : '',
    /* 2026-10-27 补：「去 AI 味审查点」在 FIELDS 数组（本文件 L136 起那行）里声明了，却**从来没有被赋值**——
     * 与「可落地要点」是同一个病、同一次漏：数组里列了名字，赋值表里少一行。
     * 这一项是规格里**唯一逐条写明「它故意反哪一条 AI 模板」**的字段
     * （S01：「①它故意反 C-1.3 与 C-2.14——主体不是居中大标题加三张等宽卡…」），
     * 30/30 齐全，铺平成一句话共 **10,065 字**（初版 10,539 字，含 S13 混入的 474 字评审工件；
     * 那一刀在下面 `audit:` 赋值处，见 `cutAuditMarker()`），此前在 data.js 与 prompts.js 里 0 命中。
     * 键名取 `audit`：`review` 在本仓库已被闸门（verify-prototype 的 findings）占用，
     * 那是机器质检结果；这一项是作者写的**审美判据**，两者混用会让读端分不清
     * 「这是机器判的」还是「这是人写的」，故此避让。
     * 位置按规格里字段 8 的顺序，放在 motion（字段 7）与 risk（字段 9）之间。
     * 证据：deliverables/63-plan/SYNTHESIS-hard-revalidation.md §6（同类漏项清单）。
     *
     * ── 2026-10-27 第二轮：这里有两个「位置」要分清，只有一个是数据层的 ──
     * ① **键顺序（数据层）**：`audit` 在 `risk` **之前** —— 见下面两行的书写顺序，别再调换。
     *    语义：`audit`（凭什么说它反了 AI）是 `risk`（所以最容易做错成什么样）的**前提**。
     *    先举证、后警告是论证；反过来是「先警告再解释」。
     *    实测（deliverables/65-exec/_cut/dump.mjs）：30/30 案 `Object.keys()` 里
     *    auditIdx = 14、riskIdx = 15，即数据层**已经**满足「audit 在 risk 之前」。
     * ② **UI 渲染顺序（不在这里）**：`prototypes/_selection/app.js` 的 `field()` 串里
     *    仍是 `field('反 AI 味风险与规避', r.risk)` 在前、`auditFold(r)` 在后（约 L702 / L708），
     *    即 UI 侧 audit 仍排在 risk **之后**。裁决文档 §3.2 实测：risk 已在约 1,900px，
     *    audit 放它后面 → 约 2,150px，用户要滚 2.4 屏。
     *    ⚠️ **UI 侧渲染顺序需同步（当前 app.js 里 audit 在 risk 之后），由面板负责人改。**
     *    本文件只负责数据层的键顺序，改不了也不该改 app.js 的渲染串。
     *
     * 另：`cutAuditMarker()` 在此处切掉 S13 混入的 473 字评审工件（见文件顶部那段长注释）。
     * 切的是**工件形状**（标记串），不是案号；30 案实测只有 S13 命中。 */
    audit: cutAuditMarker(id, spec && spec.fields['去 AI 味审查点'] ? spec.fields['去 AI 味审查点'] : ''),
    risk: spec && spec.fields['反 AI 味风险与规避'] ? spec.fields['反 AI 味风险与规避'] : '',
    /* 2026-10-27 补：「可落地要点」在 FIELDS 数组里声明了，却**从来没有被赋值**——
     * 30 案的字体子集预算、LCP 预算、可执行 CSS 思路（clip-path / 栏沟用 gap 不用 border …）
     * 因此全部蒸发，选型台与提示词里一个字都没有。派生的 copy / copyParts / errorFromCopy 都带出去了，
     * 唯独这一项漏在赋值表外。这就是「解析了 ≠ 用上了」：数组里列了名字，赋值处少一行。
     * 证据：deliverables/63-plan/SYNTHESIS-hard-revalidation.md §6 第 3 条
     * （原文写的是 FIELDS:75 有、L184-195 无 —— 行号是当时的，文件已改过多轮，别按数字找，
     *   按字段名找：FIELDS 里的「可落地要点」→ 这里的 landing:）。
     * 放在 scenes / quirk 之间，与规格里字段 11 的位置一致。 */
    landing: spec && spec.fields['可落地要点'] ? spec.fields['可落地要点'] : '',
    scenes: spec && spec.fields['适用场景'] ? spec.fields['适用场景'] : '',
    quirk: spec && spec.fields['设计师签名式怪癖'] ? spec.fields['设计师签名式怪癖'] : '',
    copy: spec ? spec.copy : '',
    copyParts: spec ? spec.copyParts : { claim: '', button: '', empty: '', error: '' },
    bg: c.bg || null,
    primary: c.primary || (spec ? spec.primaryFromSpec : null) || null,
    buttonText: c.buttonText || (spec ? spec.buttonFromSpec : null) || null,
    errorCode: c.errorCode || (spec ? spec.errorFromCopy : null) || leadCodes[id] || null,
    errorCodeSource: c.errorCode ? '规格文案' : (spec && spec.errorFromCopy ? '规格文案' : (leadCodes[id] ? 'Lead 补入（源文件缺，见 _CURRENT-VALUES.md §4）' : null)),
    palette: [],
    built: false, gate: null, shots: { desktop: [], tablet: [], mobile: [] },
  };
  // 配色：当前值优先，其余从字段 3 取（字段 3 的顺序＝角色顺序）。
  //
  // ⚠️ 字段 3 里混着**大量不是本方案配色**的 HEX，至少三类：
  //   ① 它点名反对的颜色（"反的是 `#6366F1` 靛蓝主色配纯白底"）
  //   ② 终局轮之前的**旧值**（S22 的 `#666D51`、S27 的 `#0E7264` —— 都已被替换掉）
  //   ③ 拿来做对比的参照色（S28 的 `#3B82F6`、S30 的 `#22D3EE`）
  // 上一版把字段 3 的所有 HEX 一锅端，结果这四案的 palette 末尾变成了这些"非本方案色"，
  // 而选型向导的推荐卡会把 palette.slice(0,4) 画成色块 —— **用户在推荐卡上看到的是设计里不存在的颜色**。
  // （20-style-axes 报出，我复核确认；第一版只挡了①，第②③类还在。）
  //
  // 根治办法：**只收"带角色标签"的 HEX** —— 它附近必须出现 主色/背景/底色/正文/强调/辅助/次要/结构线 之类的词，
  // 并且不能落在否定语境里。拿不到角色标签的，一律不收。
  const p3 = spec && spec.fields['配色系统'] ? spec.fields['配色系统'] : '';
  const ROLE = /(主色|背景色?|底色|地面色?|正文色?|正文|强调色?|辅助色?|次要色?|结构线|批注|脏色|纸色)/;
  /* 否定语境词表（2026-10-27 加）。
   *
   * 为什么必须加：旧版只有 ROLE 标签判据，它挡得住「没带角色标签的杂色」，挡不住
   * **规格点名要反的颜色**——因为反例在句子里的写法同样带有角色词。实测 4 案用户可见错误：
   *   S02 `#22D3EE`  「反的是"深色底 + 霓虹紫青强调"（#8B5CF6／#22D3EE）」
   *   S12 `#0F172A`  「既不是纯黑也不是 #0F172A 那种蓝黑」
   *   S17 `#111111`  「#111111 压在紫墨上只有 1.69:1，不采用」
   *   S28 `#EC4899`  「离开 #EC4899 42°」
   * 这 4 个色在各自 style.css 里出现 0 次，却排在 palette[3]——正好是列表行与向导卡显示的第 4 个色块，
   * 于是用户在选型台上看到「这个方案用到 #22D3EE」，而该方案的设计规格写着「反的是 #22D3EE」。
   *
   * ⚠️ 词表**故意不做同义扩张**，因为字段 3 里这些字长得像否定词、其实是在描述正色：
   *   「金箔反**光**」「漫反**射**」→ 不能收裸的「反」
   *   「原纸色」「原先」→ 不能收裸的「原」
   *   「旧木」「旧漆」→ 不能收裸的「旧」（S19 的 #2A241C 角色说明就是「旧木」，是真色）
   * 第一版把「反的?是?」写成裸「反」，实测误杀 S02 的 #B8860B（「金箔反光」在它前面 20 字内），
   * 又用 40 字窗口误杀 S04 #F0E2C8（前面是「旧的漆」）。所以词表只留**明确带宾语的否定句式**。
   * 词表口径就是裁决文档 §4-A 列的七个：反的 / 不是 / 不采用 / 离开 / 禁止 / 不要 / 避免（外加既不、也不等同族）。
   */
  const NEG = /(反的是|反对|反这|反「|反"|反`|反\s*#|不是|而非|既不|也不|不采用|不选|不取|不用|不使用|不要|不得|禁止|排除|避免|规避|拒绝|剔除|禁用|离开|远离)/;
  /* 窗口为什么要按标点切：否定只作用于**同一个分句**。
   *  · 向前：从上一个句读（。；，、！？换行）算起，最多 40 字。S28「…71°、离开 `#EC4899` 42°」里
   *    「离开」紧贴色值，而「反的是」在 S02 里隔着一个 #8B5CF6，都在同分句内。
   *  · 向后：到下一个句号/分号为止，最多 34 字。S17 的「不采用」在色值**之后**约 28 字
   *    （`#111111` 压在紫墨上只有 1.69:1，不采用）——只看前面永远抓不到它。
   * 按标点切还顺带避免了「前一句说反、后一句说正」的跨句误杀。
   */
  const clauseBefore = (i) => {
    const w = p3.slice(Math.max(0, i - 40), i);
    const cut = Math.max(w.lastIndexOf('。'), w.lastIndexOf('；'), w.lastIndexOf('，'), w.lastIndexOf('、'),
      w.lastIndexOf('！'), w.lastIndexOf('？'), w.lastIndexOf('\n'));
    return cut >= 0 ? w.slice(cut + 1) : w;
  };
  const clauseAfter = (j) => {
    const w = p3.slice(j, j + 34);
    const cut = w.search(/[。；！？\n]/);
    return cut >= 0 ? w.slice(0, cut) : w;
  };
  /* 结构型角色标记（词表之外的第二条通路，见 keepHex 里的 a/b/c）。
   * ROLE_NAME_AFTER：`#C9A87C 渍痕淡褐＝…` —— 色值后 1–12 字的名字 + 全角/半角等号。
   * ROLE_NAME_BEFORE：`压印暗侧 #D6CDB9（…）` —— 色值前紧贴的 2–8 个汉字。
   * 两者都只描述"排版形状"，不描述语义，所以对反例（「离开 #EC4899 42°」「反的是 #22D3EE」）
   * 不会命中：前者名字后面没有「＝」，后者名字前是「离开/反的是」这类动词短语而非颜色名。 */
  const ROLE_NAME_AFTER = /^\s*[\u4e00-\u9fa5A-Za-z0-9]{1,12}\s*[＝=]/;
  const ROLE_NAME_BEFORE = /[\u4e00-\u9fa5]{2,8}\s*$/;
  /* ⚠️ 2026-10-27 补：ROLE_NAME_BEFORE 会把「用途」误当成「颜色名」。
   * 实例（3 案，用户可见）：S22 规格写「主色作按钮底时用白字 = 6.51:1，
   * **故按钮文字指定为** `#FFFFFF`」——那 8 个汉字命中了 `[\u4e00-\u9fa5]{2,8}$`，
   * 于是 #FFFFFF 被当成「带角色名的调色板色」收进来，成了第 4 个色块。
   * 但这 3 案的规格同一段前面明写「**恰好三个色**」，而且 S22 的原话是
   * 「反的是纯白底」——修复反而把被反对的颜色塞回了调色板。
   * 判据：颜色名是一个名词短语（渍痕淡褐、压印暗侧），而「按钮文字指定为」
   * 描述的是**这个色用在哪儿**，不是它的名字。凡是短语里含这些用途动词/名词的一律不收。
   */
  const USAGE_WORDS = /(按钮|文字|字色|字体|描边|填充|背景|底色|前景|边框|阴影|高光|暗部|文字色|白字|黑字|叠印|套印)/;
  const ROLE_NAME_BEFORE_OK = (s) => ROLE_NAME_BEFORE.test(s) && !USAGE_WORDS.test(s);
  const keepHex = (h) => {
    const re = new RegExp(h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    for (const m of p3.matchAll(re)) {
      const before = clauseBefore(m.index);
      const after = clauseAfter(m.index + h.length);
      if (NEG.test(before)) continue;                 // ① 否定 / 旧值（"反的是…"、"既不是…"）
      if (NEG.test(after)) continue;                  // ① 否定写在色值之后（"…1.69:1，不采用"）
      /* 角色标签有三条通路，缺一条就会误杀真色（第一版只认词表，实测丢了 3 个真色）：
       *   a) 词表：`#B8860B 暗金＝主色与纹样` 这类带"主色/底色/正文"字样的；
       *   b) 色值**之后**紧跟「名字＝/＝用途」：S06 `#C9A87C 渍痕淡褐＝杯渍环与分隔`、
       *      S07 `#9A9384 毛口灰＝页边毛口与分隔` —— 名字是自定义词（渍痕淡褐、毛口灰），
       *      词表里不可能有，但「名字＋＝＋用途」这个结构就是"这是一个配色项"的标记；
       *   c) 色值**之前**紧跟一个 2–8 字的名字：S13 `压印暗侧 #D6CDB9（凹槽受光弱的一侧…）`。
       * b/c 两条是结构判据而非语义判据，所以它们不会把反例放进来 ——
       * 反例的上下文是「反的是…（#8B5CF6／#22D3EE）」「离开 #EC4899 42°」，
       * 既没有「＝」也没有紧贴的中文名字，且通常已被 a 之外的否定判据先拦下。 */
      if (ROLE.test(after) || ROLE.test(before)) return true;
      if (ROLE_NAME_AFTER.test(after)) return true;
      /* 用 ROLE_NAME_BEFORE_OK 而不是 ROLE_NAME_BEFORE：后者会把「故按钮文字指定为」
       * 这类**用途描述**当成颜色名（3 案 #FFFFFF 误收，见上面的注释）。 */
      if (ROLE_NAME_BEFORE_OK(before)) return true;
    }
    return false;
  };
  /* 第二道判据（更硬）：**样式面里必须出现 ≥1 次**。
   * 理由与实现见文件头 styleSurface() 的注释。与否定词表的关系是互补而非重复：
   *   词表治「规格里写了但语义是否定」，样式面治「规格里写了但实现里根本没用到」——
   *   后者不管句子怎么写都能抓住，是真正兜底的那一条。任一条判死即剔除。 */
  const fromSpec = hexes(p3).filter((h) => {
    if ((stale[id] || []).includes(h)) { PAL_DROPPED.push({ id, hex: h, why: '§2 作废旧值' }); return false; }
    if (!keepHex(h)) { PAL_DROPPED.push({ id, hex: h, why: '否定语境或无角色标签' }); return false; }
    if (dir && !inStyle(dir, h)) { PAL_DROPPED.push({ id, hex: h, why: '样式面 0 次（规格有、CSS/SVG 没用）' }); return false; }
    return true;
  });
  const pal = [];
  if (rec.bg) pal.push(rec.bg);
  if (rec.primary && !pal.includes(rec.primary)) pal.push(rec.primary);
  for (const h of fromSpec) { if (pal.length >= 4) break; if (!pal.includes(h)) pal.push(h); }
  rec.palette = pal;
  // primary 兜底：字段 3 的"主色"位置在部分案子里被写到了别处，于是 primary 会等于底色
  // （S01 取到 #EFE7D7 就是底色）或取到文字色（S02 取到 #EFE6D0）。
  // 这个字段目前没有任何界面在用，但留着错值会误导下一个读它的人。
  // 兜底规则：primary 与 bg 相同、或 primary 不在 palette 里、或 palette 有 ≥2 项，
  // 就取 palette[1]（第一个非底色项）。
  if (pal.length >= 2 && (!rec.primary || rec.primary === rec.bg || !pal.includes(rec.primary))) {
    rec.primary = pal[1];
  }

  if (dir) {
    const rep = join(PROTO, dir, '.inspect', 'report.json');
    rec.built = existsSync(join(PROTO, dir, 'index.html'));
    if (existsSync(rep)) {
      try {
        const j = JSON.parse(readFileSync(rep, 'utf8'));
        const fails = (j.findings || []).filter((f) => f.level === 'FAIL');
        const warns = (j.findings || []).filter((f) => f.level === 'WARN');
        const d = (j.viewports || []).find((v) => v.width === 1440);
        rec.gate = {
          fail: fails.length, warn: warns.length,
          failIds: [...new Set(fails.map((f) => f.id))],
          warnIds: [...new Set(warns.map((f) => f.id))],
          at: j.at,
          screens: d ? d.screens : null,
          realPictures: d ? d.metrics.page.realPictures : null,
          overflow: d ? d.metrics.page.horizontalOverflow : null,
          words: d ? d.metrics.page.words : null,
        };
        for (const im of j.images || []) {
          const nm = im.width >= 1100 ? 'desktop' : im.width >= 600 ? 'tablet' : 'mobile';
          if (im.fold) rec.shots[nm].push(`../${dir}/.inspect/${im.fold.split(/[\\/]/).pop()}`);
          for (const pg of im.pages || []) rec.shots[nm].push(`../${dir}/.inspect/${pg.split(/[\\/]/).pop()}`);
        }
      } catch { /* 报告坏了就当没有 */ }
    }
  }
  // ── 用户能回答的轴（全部机械算，来自实测值，不引入主观打分）──
  // 为什么加这个：选型台左栏原本是 结构类型(F/R)／认知门槛／调性(7个四字词)／建成状态／闸门(FAIL 计数)
  // ——前三组是**设计口径**，后两组是**项目自己的质检状态**（"FAIL 2"跟选风格毫无关系）。
  // 用户能回答的问题一组都没有，这是"五分钟选不出来"的第一大障碍（20-style-axes 诊断，我采纳）。
  // 这里只放能算出来的，算不出来的（年代感、贵不贵）不硬造。
  {
    const rgbOf = (hex) => {
      const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
      if (!m) return null;
      const n = parseInt(m[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const relLum = (rgb) => {
      if (!rgb) return null;
      const s = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
      return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
    };
    const hslOf = (rgb) => {
      if (!rgb) return null;
      const [r0, g0, b0] = rgb.map((v) => v / 255);
      const mx = Math.max(r0, g0, b0), mn = Math.min(r0, g0, b0), l = (mx + mn) / 2;
      let h = 0, s = 0;
      if (mx !== mn) {
        const d = mx - mn;
        s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        if (mx === r0) h = (g0 - b0) / d + (g0 < b0 ? 6 : 0);
        else if (mx === g0) h = (b0 - r0) / d + 2;
        else h = (r0 - g0) / d + 4;
        h *= 60;
      }
      return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
    };

    const bgRgb = rgbOf(rec.bg);
    const L = relLum(bgRgb);
    const bh = hslOf(bgRgb);
    const chroma = Math.max(0, ...(rec.palette || []).map((h) => (hslOf(rgbOf(h)) || { s: 0 }).s));
    const words = rec.gate && typeof rec.gate.words === 'number' ? rec.gate.words : null;

    // 底色带：把背景归到几条"看得出来是同一条带"的区间里。
    // 这一步的意义不只是分类 —— 它把"19/26 个案子挤在同一条暖浅色带里"这件事**摆到台面上**，
    // 让用户在筛选时就能看见"可选项其实没那么多"。实测见 deliverables/21-lead-verify-homogeneity.md。
    let band = null;
    if (bh) {
      const warm = bh.h <= 70 || bh.h >= 330;
      const cool = bh.h > 150 && bh.h < 290;
      if (bh.l >= 78) band = warm ? '暖浅色带' : cool ? '冷浅色带' : '中性浅带';
      else if (bh.l <= 22) band = cool ? '冷暗带' : '暖暗带';
      else band = '中间明度带';
      if (bh.s <= 8) band = bh.l >= 78 ? '中性浅带' : bh.l <= 22 ? '纯中性暗带' : '中性中带';
    }

    rec.axes = {
      ground: L === null ? null : L >= 0.5 ? '亮底' : L >= 0.12 ? '中间调' : '暗底',
      groundL: L === null ? null : Math.round(L * 100),
      band,
      bandHue: bh ? bh.h : null,
      bandL: bh ? bh.l : null,
      bandSat: bh ? bh.s : null,
      load: words === null ? null : words <= 350 ? '一屏说清' : words <= 700 ? '三五屏' : '很多栏目',
      words,
      loud: chroma <= 25 ? '很安静' : chroma <= 60 ? '有态度不吵' : '就要扎眼',
      chroma,
    };
  }

  // ── 适用场景：先剪掉串进来的"文案"，再拆极性 ──
  // 为什么必须拆：字段 10 的字面形态是「适合（一）…（二）…**不适合：**…」，正反两段在同一个字符串里。
  // 把整串丢进搜索索引会让**正负一起进**：实测搜"政务"命中 7 行，**7/7 全部只出现在"不适合"从句里**
  // （金融 4/4、医疗 4/4、电商 8/8 同样），而行卡又不渲染 scenes →
  // 用户看到 7 行却没有一行印出"政务"，唯一能得出的结论是"有 7 个方案适合政务"，
  // **而这 7 个全都写着"不适合政务"**。
  // （由选型台可用性辩护员实测抓出：这是我在一次"修复"里自己引入的反向信号——
  //   原来的 0 命中至少诚实，改完反而更难发现。）
  // 全库 30/30 都用「不适合：」这一标记，可精确切分。
  //
  // ⚠️ 但光按「不适合：」切还不够：**文案段本身会串进字段 10**（52/57 双席报出，本批复算 20/30 命中）。
  // 机制不是"切分正则贪婪"，而是**字段切分**在两种书写惯例下各漏一次，漏的方向还相反：
  //   路径 A（S11–S20，B 惯例）：文案写成 `**可直接上线的文案**` 独占一行，**没有字段编号**，
  //     于是 `starts` 认不出它是一个字段起点，它的正文被并进了**上一个**字段（= 字段 10）。
  //     它在「不适合：」之后，所以整段落在 **scenesNo** 尾巴上（10 案）。
  //   路径 B（S21–S30，C 惯例）：文案写成 `上站文案三处：主张句"…"按钮"…"空状态"…"`，
  //     和字段 10 正文**同一行**、且写在「不适合：」**之前**，于是整段落在 **scenesYes** 尾巴上（10 案）。
  // 危害不对称：**路径 B 更严重** —— 文案里的「按钮」「空状态」是**主张句**，
  // 却被算进"适合场景"，搜「按钮」直接命中 10 个与 UI 文案无关的方案（57 号实测 11 案假命中）。
  //
  // 切法：在 scenes 里找**文案标签**（三种叫法都要认，前面允许残留「。：；」等收尾标点）；
  // 剪掉标签及其正文，但**保留正文里紧跟其后的「不适合：」段**（路径 B 的否定句被文案夹在中间，
  // 直接 cut 到行尾会把它一起丢掉）。
  // 剪掉不丢信息：文案在 `rec.copy` / `rec.copyParts` 里独立承载，实测 30/30 非空。
  {
    const COPY_LABEL = /(?:真实上站文案|可直接上线的文案|上站文案三处)[\s\p{P}“”"」]*[：:]/u;
    const NEG = '不适合：';
    const cleanScenes = (raw) => {
      const s = String(raw || '');
      const m = COPY_LABEL.exec(s);
      if (!m) return s.trim();
      const head = s.slice(0, m.index);
      const after = s.slice(m.index + m[0].length);
      const n = after.indexOf(NEG);                       // 文案段之后若还有"不适合"，接回来
      return (head + (n >= 0 ? after.slice(n) : '')).replace(/[\s；;。，、]+$/, '').trim();
    };
    const s = cleanScenes(rec.scenes);
    rec.scenes = s;                                        // 详情面板读的是这个字段，同样必须干净
    const i = s.indexOf(NEG);
    rec.scenesYes = i >= 0 ? s.slice(0, i).trim() : s.trim();
    rec.scenesNo = i >= 0 ? s.slice(i + NEG.length).trim() : '';
  }

  out.push(rec);
}

const built = out.filter((r) => r.built && r.shots.desktop.length).length;
const clean = out.filter((r) => r.gate && r.gate.fail === 0).length;
console.log(`30 案：有页面 ${out.filter((r) => r.built).length}｜有截图 ${built}｜FAIL=0 ${clean}`);
const noDef = out.filter((r) => !r.def).map((r) => r.id);
const noPal = out.filter((r) => r.palette.length < 2).map((r) => r.id);
if (noDef.length) console.log('⚠ 没解析出一句话定义的：' + noDef.join(' '));
if (noPal.length) console.log('⚠ 配色不足 2 个的：' + noPal.join(' '));

/* 字段 8 切断日志（2026-10-27 加）。
 * 与下面的「调色板剔除日志」同一个理由：切断是**有损**的，不能只在内存里悄悄做完。
 * 它没有命中任何案时也要打印一行「无」—— 否则下次重构把标记改坏了，
 * 输出会安静地什么都不说，而「0 命中」与「没跑这段」在屏幕上长得一模一样。
 * 反过来，若某天这里冒出第二个案号，说明工件形状扩散了，读日志的人应当立刻看见。 */
console.log(`\n字段 8 评审工件切断（标记「${AUDIT_CUT_MARK}」，按标记不按案号）：` +
  (AUDIT_CUT_LOG.length
    ? AUDIT_CUT_LOG.map((d) => `${d.id} ${d.before}→${d.after} 字（切于第 ${d.at} 字）`).join('｜')
    : '无命中'));

/* 调色板剔除日志（2026-10-27 加）。
 * 为什么必须打印：这道过滤是**有损**的——它会把字段 3 里 96 个候选 hex 干掉 70 多个。
 * 如果只在内存里悄悄做完，下一个读 data.js 的人无从判断"某个色不见了"是修好了还是抽坏了。
 * 所以每条都留痕：案号 / 色值 / 剔除原因（否定语境、§2 作废、样式面 0 次）。
 * 尤其要能一眼看出「样式面 0 次」这一类 —— 那是本轮真正的兜底判据。 */
{
  const byWhy = {};
  for (const d of PAL_DROPPED) byWhy[d.why] = (byWhy[d.why] || 0) + 1;
  console.log(`\n调色板剔除 ${PAL_DROPPED.length} 个候选 hex：` +
    Object.entries(byWhy).map(([k, v]) => `${k} ${v}`).join('｜'));
  const noStyle = PAL_DROPPED.filter((d) => d.why.startsWith('样式面'));
  if (noStyle.length) console.log('  样式面 0 次（规格有、实现没用到）：' + noStyle.map((d) => `${d.id}${d.hex}`).join(' '));
  for (const d of out) {
    const drop = PAL_DROPPED.filter((x) => x.id === d.id);
    if (drop.length) console.log(`  ${d.id} 剔除 ${drop.map((x) => x.hex + '(' + x.why + ')').join(' ')}`);
  }
}

if (!check) {
  mkdirSync(OUTDIR, { recursive: true });
  const js = '/* 由 prototypes/_build/collect-schemes.mjs 生成，勿手改。\n   数据来源优先级：_CURRENT-VALUES.md（当前有效色值） > _specs/Sxx.md（12 字段） > .inspect/report.json（闸门与截图） */\nwindow.SCHEMES = ' + JSON.stringify(out, null, 1) + ';\n';
  writeFileSync(join(OUTDIR, 'data.js'), js, 'utf8');
  console.log(`已写 prototypes/_selection/data.js（${(js.length / 1024).toFixed(1)} KB）`);
} else {
  // 直接打印自检表：不要用 pwsh 的 > 去接，那会写成 UTF-16 变成"二进制文件"
  console.log('\n方案 中文名                     F/R 结构         门槛 背景      主色      按钮      错误码        配色数 页面 闸门');
  for (const r of out) {
    const g = r.gate ? `FAIL=${r.gate.fail} WARN=${r.gate.warn}` : '—';
    console.log(
      r.id + ' ' + String(r.cn).padEnd(20) + ' ' + (r.fr || '?') + '   ' + String(r.structure).padEnd(12) + ' ' +
      String(r.threshold).padEnd(4) + ' ' + String(r.bg || '—').padEnd(9) + ' ' + String(r.primary || '—').padEnd(9) + ' ' +
      String(r.buttonText || '—').padEnd(9) + ' ' + String(r.errorCode || '—').padEnd(12) + ' ' +
      String(r.palette.length).padStart(2) + '   ' + (r.built ? '✓' : '✗') + '    ' + g +
      (r.def ? '' : '   ⚠无定义')
    );
  }
  const miss = (f) => out.filter((r) => !f(r)).map((r) => r.id);
  console.log('\n缺 一句话视觉定义：' + (miss((r) => r.def).join(' ') || '无'));
  console.log('缺 美学家族：      ' + (miss((r) => r.family).join(' ') || '无'));
  console.log('缺 字体策略：      ' + (miss((r) => r.fontsSpec).join(' ') || '无'));
  console.log('缺 布局与网格：    ' + (miss((r) => r.layout).join(' ') || '无'));
  /* 2026-10-27 补：landing 与 audit 这两个字段各自丢过一整轮，**而上面这张自检表查不出来**——
   * 它只查 def / family / fonts / layout / copy 五项，赋值表里少一行时脚本照样打印「无」，
   * 于是连跑 30 次都看不出少了东西，只能靠人去数 data.js 的键。
   * 教训：自检表覆盖的字段必须与赋值表的字段同一份清单，否则它就是一张安慰剂。
   * 这里把两项补进来（顺序按规格里字段 8 与字段 11 的位置）。 */
  console.log('缺 去 AI 味审查点：' + (miss((r) => r.audit).join(' ') || '无'));
  console.log('缺 可落地要点：    ' + (miss((r) => r.landing).join(' ') || '无'));
  console.log('缺 真实上站文案：  ' + (miss((r) => r.copy).join(' ') || '无'));
  console.log('缺 背景或主色：    ' + (miss((r) => r.bg && r.primary).join(' ') || '无'));
  console.log('缺 错误码：        ' + (miss((r) => r.errorCode).join(' ') || '无'));
  console.log('配色 < 3 个：      ' + (miss((r) => r.palette.length >= 3).join(' ') || '无'));
}
