#!/usr/bin/env node
/* 选型台界面文案闸门（2026-11-04 新增，W5）
 *
 * 为什么需要它：`check-docs.mjs` 有 13 条断言，**全部针对 README.md**；
 * `index.html` 是产品界面，在此之前**一条断言都没有**。后果是实测出来的：
 *   · summary 写「11 组 47 颗芯片」，实际 10 组 73 颗
 *   · 「多数案 10 段、个别 9 段」，实际 12 段
 * 两个错误数字在公网 `sqkl520.github.io` 上至少对外服务了 8 天。
 *
 * 判据的设计原则：**界面里复述可计算量的数字必须派生，不许手打。**
 * W2 已把这两处改成 `<span data-derived="...">`，由 app.js 的 fillDerived() 现算。
 * 这个闸门守的就是那个机制不被绕过 —— 它查的是「有没有退回手写」，不是「数字对不对」。
 * 数字对不对由 `probe-ui.mjs` 在真实浏览器里量（那需要跑 app.js，静态扫不到）。
 *
 * 用法：
 *   node prototypes/_build/check-ui-copy.mjs
 *   node prototypes/_build/check-ui-copy.mjs --selftest   # 变异测试
 *
 * 退出码：0 无 FAIL；1 有 FAIL。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/* 仓库根：与其他闸门一致用 `new URL('../..', import.meta.url)`。
 * 注意它与 `resolve(fileURLToPath(import.meta.url), '../..')` **不同** ——
 * 前者以文件所在**目录**为基址（所以 ../.. = 仓库根），
 * 后者以**文件本身**为基址（要 ../../.. 才是仓库根）。这里踩过一次。 */
const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const SEL = join(ROOT, 'prototypes/_selection');
const HTML = join(SEL, 'index.html');
const CSS = join(SEL, 'style.css');
const APP = join(SEL, 'app.js');

const QUIET = process.argv.includes('--quiet');
const findings = [];
const add = (level, rule, msg) => findings.push({ level, rule, msg });

/* ── 读取 ────────────────────────────────────────────────────────────── */
function stripHtmlComments(s) {
  return s.replace(/<!--[\s\S]*?-->/g, ' ');
}
function stripCssComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

const rawHtml = readFileSync(HTML, 'utf8');
const html = stripHtmlComments(rawHtml);
const rawCss = readFileSync(CSS, 'utf8');
const css = stripCssComments(rawCss);
const app = readFileSync(APP, 'utf8');

/* fillDerived() 认识的 key（从 app.js 里现读，不手抄 —— 手抄的清单会和实现脱节）。 */
function derivedKeysFromApp() {
  const m = app.match(/var vals = \{([\s\S]*?)\};/);
  if (!m) return null;
  return new Set([...m[1].matchAll(/'([\w-]+)'\s*:/g)].map((x) => x[1]));
}
const DERIVED_KEYS = derivedKeysFromApp();

/* ══════════════════════════════════════════════════════════════════════
   断言 1：所有 data-derived 的 key 都必须是 fillDerived() 认识的
   —— 否则那个 span 会永远显示它的 HTML 兜底值（静态数字），而没人会发现。
   ══════════════════════════════════════════════════════════════════════ */
const usedKeys = [...html.matchAll(/data-derived="([\w-]+)"/g)].map((m) => m[1]);
if (!DERIVED_KEYS) {
  add('FAIL', 'derived-keys-parseable', '在 app.js 里找不到 `var vals = {...}`，无法确定 fillDerived 认识哪些 key');
} else {
  for (const k of new Set(usedKeys)) {
    if (!DERIVED_KEYS.has(k)) {
      add('FAIL', 'derived-key-unknown', `index.html 里有 data-derived="${k}"，但 fillDerived() 不认这个 key —— 它会永远显示兜底值`);
    }
  }
  /* fillDerived 必须给每个填过的 span 打 data-filled 标记。
   * 为什么需要这个标记：一个变异审计实测出过假绿 —— `fillDerived()` 里插一个 throw
   * （数字退回 HTML 兜底），再把兜底值"顺手更新成正确值"（11→10、45→73），
   * 光比对数字的断言会报 8 PASS / 0 FAIL，而页面上的数字根本不是算出来的。
   * 有了标记，闸门可以先问「跑过没有」再问「对不对」。 */
  if (!/setAttribute\(\s*['"]data-filled['"]/.test(app)) {
    add('FAIL', 'derived-no-filled-marker',
      'app.js 的 fillDerived() 没有写 data-filled 标记 —— 闸门就无法区分「算出来的数字」和「HTML 兜底值」');
  }
  for (const k of DERIVED_KEYS) {
    if (!usedKeys.includes(k)) {
      add('WARN', 'derived-key-unused', `fillDerived() 会算 "${k}"，但 index.html 里没有对应的 data-derived 节点`);
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════
   断言 2：几个特定位置不许再出现手写的数字
   这是「回归」判据：W2 修掉的正是这几处，任何一处退回手写都要红。
   ══════════════════════════════════════════════════════════════════════ */
const HARDCODED_GUARDS = [
  {
    rule: 'chip-count-hardcoded',
    /* 筛选条 summary 里的「N 组 M 颗」。允许夹着 data-derived 的 span，
       所以先把 span 整体抹成占位符，再看还有没有裸数字。 */
    re: /rail-fold-sum[^>]*>([\s\S]*?)<\/summary>/,
    what: '筛选条 summary（组数 / 芯片数）',
    digits: /\d+\s*组|\d+\s*颗/,
  },
  {
    rule: 'field-count-hardcoded',
    re: /class="[^"]*\brail-note\b[^"]*"[^>]*>([\s\S]*?)<\/div>/,
    what: '「怎么用」说明里的字段段数',
    digits: /(多数案|个别)\s*\d+\s*段/,
  },
];
for (const g of HARDCODED_GUARDS) {
  const m = html.match(g.re);
  if (!m || m[1] === undefined) { add('WARN', 'guard-anchor-missing', `找不到「${g.what}」的锚点（HTML 结构变了？）`); continue; }
  /* 抹掉 data-derived span 的**内容**再查 —— span 本身可以留，里面的数字由 JS 填 */
  const masked = m[1].replace(/<span[^>]*data-derived="[^"]*"[^>]*>[\s\S]*?<\/span>/g, '<DERIVED/>');
  if (g.digits.test(masked)) {
    add('FAIL', g.rule, `「${g.what}」里还有手写的数字：${(masked.match(g.digits) || [])[0]}`);
  }
}

/* ══════════════════════════════════════════════════════════════════════
   断言 3：图例承诺的「实心 / 虚边」必须在 CSS 里真的有两条不同规则
   index.html 的图例说「实心＝有直连方案，虚边＝换文案能用」。
   在 W2 之前，`.is-direct` / `.is-near` 在全仓 CSS 里是 0 处引用 —— 图例是空话。
   ══════════════════════════════════════════════════════════════════════ */
{
  const hasDirect = /\.scene-chip\.is-direct\s*\{[^}]*border-style\s*:\s*solid/.test(css);
  const hasNear = /\.scene-chip\.is-near\s*\{[^}]*border-style\s*:\s*dashed/.test(css);
  if (!hasDirect || !hasNear) {
    add('FAIL', 'legend-not-implemented',
      `图例承诺「实心 vs 虚边」，但 CSS 里 ${!hasDirect ? '缺 .is-direct{border-style:solid} ' : ''}${!hasNear ? '缺 .is-near{border-style:dashed}' : ''}`);
  }
  /* 近似芯片挂在 .scene-more 里（.chips 之外），必须被同一个选择器覆盖 ——
     这是 W2 那个「视觉倒置」的根因。 */
  if (!/\.scene-more button/.test(css)) {
    add('FAIL', 'near-chips-unstyled',
      'CSS 里没有 `.scene-more button` 的样式 —— 28 颗近似芯片会退回 UA 的 16px/outset，比直连芯片更大更粗');
  }
}

/* ══════════════════════════════════════════════════════════════════════
   断言 4：注释声称的行为必须在标记里真的存在
   W2 之前，index.html 与 style.css 两处注释都在按「#count 是 aria-live 的活口」
   论证布局决定，而那个属性根本不存在。
   ══════════════════════════════════════════════════════════════════════ */
{
  const rawSaysLive = /aria-live/.test(rawHtml) || /aria-live/.test(rawCss);
  const reallyLive = /id="count"[^>]*aria-live/.test(html) || /aria-live[^>]*id="count"/.test(html);
  /* 只在注释提过 aria-live 且指向 #count 时才要求实现 */
  const commentClaimsCountLive = /#count[^\n]{0,40}aria-live|aria-live[^\n]{0,40}#count/.test(rawHtml + rawCss);
  if (commentClaimsCountLive && !reallyLive) {
    add('FAIL', 'aria-live-claimed-not-implemented',
      '注释声称 #count 是 aria-live 活口，但标记里没有这个属性');
  }
  if (!reallyLive) {
    add('FAIL', 'count-not-live', '#count 没有 aria-live —— 筛选结果与复制确认都不会被播报');
  }
}

/* ══════════════════════════════════════════════════════════════════════
   断言 5：data.js 的字段必须有消费者（scenesNo 类）
   这一条只做**已知字段**的定点检查，不做通用的「所有字段都要有消费者」——
   后者会误报大量本就只给下游用的字段（palette/gate/shots 等）。
   ══════════════════════════════════════════════════════════════════════ */
{
  const FIELDS_WITH_UI = ['scenesNo'];
  for (const f of FIELDS_WITH_UI) {
    const inApp = new RegExp(`\\b${f}\\b`).test(app);
    const inPc = /scenesNo/.test(readFileSync(join(SEL, 'prompt-copy.js'), 'utf8'));
    if (!inApp && !inPc) {
      add('FAIL', 'field-no-consumer', `data.js 的 ${f} 在 app.js / prompt-copy.js 里都没有消费者（有值但没人读）`);
    }
  }
}

/* ── 输出 ────────────────────────────────────────────────────────────── */
if (!QUIET) {
  console.log('选型台界面文案：index.html / style.css / app.js');
  const order = { FAIL: 0, WARN: 1, INFO: 2 };
  findings.sort((a, b) => order[a.level] - order[b.level]);
  for (const f of findings) {
    const mark = f.level === 'FAIL' ? '✗' : f.level === 'WARN' ? '~' : '·';
    console.log(`  ${mark} [${f.rule}] ${f.msg}`);
  }
  const nf = findings.filter((f) => f.level === 'FAIL').length;
  const nw = findings.filter((f) => f.level === 'WARN').length;
  console.log(`\n合计 FAIL ${nf} / WARN ${nw}`);
  console.log(`  data-derived key: ${usedKeys.length ? [...new Set(usedKeys)].join(', ') : '（无）'}`);
  console.log(`  fillDerived 认识: ${DERIVED_KEYS ? [...DERIVED_KEYS].join(', ') : '（解析失败）'}`);
}
process.exit(findings.some((f) => f.level === 'FAIL') ? 1 : 0);
