// 提示词内容闸门：校验 30 条提示词「说了什么」是否与独立来源一致
//
// 为什么需要它：2026-10-30 受控 A/B 实测——把 S19 主色 #4A5C3A 篡改成 #FF00FF，
// check-docs.mjs 的 13 条断言零反应（PASS 11 / FAIL 0 / WARN 1 两态完全相同），
// 而用户剪贴板里那条约束真的变了。check-docs 校的是 README 与数据的一致性，
// 不是提示词内容本身的正确性。
//
// 这造成一个洞：30 条提示词重生成完全没有保护，改对改错都是绿的。
//
// 本闸门的设计原则（三条，都来自实测教训）：
//   1. **独立来源对账**：提示词的内容必须与 style.css 的真实渲染值对上，
//      而不是与 dna-clean.json 对上——后者就是提示词的来源，自己对自己没有意义。
//   2. **纯文本，零浏览器**：跑一遍必须在秒级。上一轮 3 案端到端花了 3 个 Agent，
//      统计上证明不了任何事（要证 ≥90% 需 29 次），但文本自洽性可以 30/30 全量。
//   3. **只报「可判定」的**：不判「像不像」，只判「说的和做的一致不一致」。
//
// 用法：
//   node prototypes/_build/check-prompts.mjs           # 全量，人读
//   node prototypes/_build/check-prompts.mjs --quiet   # 只输出汇总
//   node prototypes/_build/check-prompts.mjs --json    # 机器读
//   退出码 0 = 全部一致；1 = 有不一致

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PROTOS = join(ROOT, 'prototypes');

const argv = process.argv.slice(2);
const QUIET = argv.includes('--quiet');
const JSON_OUT = argv.includes('--json');

/* ── 读提示词 ────────────────────────────────────────────────────────────
 * prompts.js 是 `window.STYLE_PROMPTS = {...}` 形式的普通脚本，不是 ES 模块。
 * 用 Function 包一层在沙箱里求值，不引 jsdom。
 */
const promptsSrc = readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8');
const sandbox = { window: {} };
new Function('window', promptsSrc)(sandbox.window);
const STYLE_PROMPTS = sandbox.window.STYLE_PROMPTS;

/* ── 读 prompt-copy.js 里的模板函数 ──────────────────────────────────────
 * buildStylePrompt 依赖 window.STYLE_PROMPTS + window.SCHEMES（data.js）。
 * 这里只取它生成文本的能力，所以要连 data.js 一起喂。
 */
function loadBuildPrompt() {
  const dataSrc = readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8');
  const copySrc = readFileSync(join(ROOT, 'prototypes/_selection/prompt-copy.js'), 'utf8');
  const w = { STYLE_PROMPTS, console: { warn() {}, log() {} } };
  w.window = w;
  try { new Function('window', dataSrc)(w); } catch (e) { /* data.js 可能引用 DOM，忽略 */ }
  // prompt-copy.js 在末尾挂 window.buildStylePrompt；它内部可能碰 DOM，用 stub 兜住
  const stubEl = () => ({
    style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {}, appendChild() {}, addEventListener() {},
    querySelector: () => null, querySelectorAll: () => [], innerHTML: '', textContent: '',
    insertBefore() {}, removeChild() {}, remove() {}, focus() {}, cloneNode() { return stubEl(); },
  });
  w.document = { createElement: stubEl, querySelector: () => null, querySelectorAll: () => [], body: stubEl(), addEventListener() {}, documentElement: stubEl() };
  w.navigator = { clipboard: { writeText: async () => {} } };
  w.setTimeout = () => {}; w.clearTimeout = () => {};
  try { new Function('window', 'document', 'navigator', 'setTimeout', 'clearTimeout', copySrc)(w, w.document, w.navigator, w.setTimeout, w.clearTimeout); } catch (e) { /* 忽略 DOM 相关失败 */ }
  return w.buildStylePrompt;
}

const buildStylePrompt = loadBuildPrompt();

/* ── 案目录 ──────────────────────────────────────────────────────────── */
const DIRS = readdirSync(PROTOS, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();

const byId = new Map(DIRS.map((d) => [d.slice(0, 3), d]));

/* ── 工具 ─────────────────────────────────────────────────────────────── */
const HEXT = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
const norm = (h) => { h = h.toLowerCase(); return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h; };
const hexes = (s) => [...new Set([...String(s).matchAll(HEXT)].map((m) => norm(m[0])))];

/* 剥 CSS 注释——`extract-dna.mjs` 就是因为不剥，把注释当字体名吞了（本轮实测）。 */
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/* 展开 :root 变量。
 * 为什么必须做：S13 的 `lineWidths` 里有一级 `9px`，它来自
 * `border-bottom: var(--band-shade) solid var(--shade)` + `--band-shade: 9px`。
 * 不展开变量就会误判「提示词声称的值在 CSS 里查不到」——2026-10-30 第一版闸门
 * 就是这么误报的：报 S13 的 9px 不存在，实际它在 :root 里，用了 8 处。
 */
function parseRootVars(css) {
  const m = stripCssComments(css).match(/:root\s*\{([\s\S]*?)\}/);
  const out = new Map();
  if (!m) return out;
  for (const x of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out.set(x[1], x[2].trim());
  return out;
}
function resolveVars(v, vars, depth = 0) {
  if (depth > 8) return v;
  return v.replace(/var\((--[\w-]+)(?:\s*,\s*([^)]*))?\)/g, (_, name, fb) => {
    const hit = vars.get(name);
    return hit !== undefined ? resolveVars(hit, vars, depth + 1) : (fb || '');
  });
}

/* 求值 calc() 里的一元/二元算术。
 * 为什么需要：S27 的 `border-left: calc(var(--mis) * 2)`，`--mis: 1.8px` → 3.6px。
 * 不展开 calc，闸门就查不到 3.6，误报成「提示词编了一个值」。
 *
 * 只处理 `calc(数字px 运算符 数字px)` 这类简单形式——专门为线宽设计，
 * 不追求通用 CSS 计算。遇到不认识的形态原样返回，不猜。
 */
function evalCalc(v) {
  return v.replace(/calc\(\s*([^()]*?)\s*\)/g, (whole, expr) => {
    const m = expr.match(/^\s*(\d*\.?\d+)px\s*([*\/+\-])\s*(\d*\.?\d+)(px)?\s*$/);
    if (!m) return whole;
    const a = parseFloat(m[1]), op = m[2], b = parseFloat(m[3]);
    let r = NaN;
    if (op === '*') r = a * b;
    else if (op === '/') r = b ? a / b : NaN;
    else if (op === '+') r = a + b;
    else if (op === '-') r = a - b;
    return Number.isFinite(r) ? r + 'px' : whole;
  });
}

/* ── 机制句的数值与语义词断言（2026-11-04 加）──────────────────────────
 *
 * 为什么需要：`dna.mechanism` 是提示词里**唯一**一句结构描述，也是唯一携带
 * 本案独有数字的地方（30 条提示词共 403 个带单位 token，机制句占 141 = 35%）。
 * 而在本轮之前，**8 个 check 脚本对 `.mechanism` 的引用是 0** —— 也就是说
 * 提示词里唯一一句"这个风格长什么样"的话，从来没有被任何闸门看过一眼。
 * 后果是实测出来的：抽查 9 条机制句，5 条与实现不符（S01/S04/S07/S09/S10/S17/S25/S26）。
 *
 * 判据的边界（重要，别扩）：
 *   · **只查 `px` / `mm` / `%`**。刻意**不**查「栏/列/行/层/枚/档/倍/fr/角度」——
 *     那些在 CSS 里不是值而是**区间**（`grid-column: 1/9` 是 8 栏）或 **DOM 节点计数**
 *     （S19 的「5 行」是数出来的）。实测把它们纳入会产生 32 条 FAIL，绝大多数是误报。
 *   · **S03「9 栏」、S07「5 栏对 7 栏」这类量纲错配，这条断言抓不到**（数字确实存在，
 *     只是在 `5fr` 里）。那类只能人工改文案，已在 74-w4/00-EXECUTION-PLAN.md 逐条改过。
 *   · **三档**：声明侧命中 = PASS；只在注释里 = WARN（注释是推导依据，不是声明）；
 *     两处都没有 = FAIL。
 */

/* 词边界：`1px` 不能命中 `11.375px`，`5px` 不能命中 `25px`。
 * 这是 S10 的 `1px` 真错能被抓到、而 S07 的 `0.5px`（源码写 `.5px`）不误报的唯一防线。 */
const MECH_TOKEN_RE = /(?<![\d.])(\d+(?:\.\d+)?)\s*(px|mm|%)(?![\w])/g;

/* 从源码抽长度集合。四类都收：
 *   · `Npx` / `Nmm`
 *   · SVG 无单位 `stroke-width: N`（S09 的 3.5）
 *   · SVG 无单位 `r="N"` / `rx` / `ry`（S17 的 1.2）
 *   · `opacity: .NN` 归一成 `NN%`（S07 的 `.14` ↔ 14%）
 * ⚠️ 无单位容差**不能扩到坐标属性**（`x`/`y`/`x1`/`width`/`height`）：
 *    实测那样做会让 S10 的 `1px` 被 `x1="1"` 吸收、S17 的 `96px` 被 `y="96"` 吸收，
 *    两条真错当场消失。 */
function mechSourceNumbers(src, vars) {
  const len = new Set();
  const pct = new Set();
  const push = (v) => { const n = Number(v); if (Number.isFinite(n)) len.add(n.toFixed(2)); };

  for (const m of src.matchAll(/(?<![\w-])(\d*\.?\d+)\s*(px|mm)(?![\w])/g)) push(m[1]);
  for (const m of src.matchAll(/stroke-width\s*[:=]\s*["']?(\d*\.?\d+)/g)) push(m[1]);
  for (const m of src.matchAll(/\b(?:r|rx|ry)\s*[:=]\s*["'](\d*\.?\d+)["']/g)) push(m[1]);
  for (const m of src.matchAll(/(\d*\.?\d+)\s*%/g)) {
    const n = Number(m[1]); if (Number.isFinite(n)) pct.add(n.toFixed(2));
  }
  /* opacity 归一：`opacity: .14` / `opacity:min(.14, ...)` 两种写法都要认。
   * 后者的 `.14` 在一个函数调用里，简单的 `opacity\s*:\s*(\.\d+)` 抓不到 ——
   * S07 的「8% 至 14%」正是这种（`style.css:107` 的 `min(.14, calc(...))`）。 */
  for (const m of src.matchAll(/opacity\s*:\s*[^;{}]*?(\d*\.\d+)/g)) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0 && n <= 1) pct.add((n * 100).toFixed(2));
  }
  /* HTML/JS 里内联声明的 `opacity:.NN` 同样归一 */
  for (const m of src.matchAll(/opacity\s*=\s*["']?(\d*\.\d+)/g)) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0 && n <= 1) pct.add((n * 100).toFixed(2));
  }
  /* :root 变量展开：`--x: 3.5px` 已由上面的通用 px 扫描收进；这里补 var() 引用处的间接值 */
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      if (!k) continue;
      const m = String(v).match(/^(\d*\.?\d+)\s*(px|mm)?$/);
      if (m) push(m[1]);
    }
  }
  return { len, pct };
}

/* JS 体里的裸数字（含小数），单独成一个集合 —— 上面的 mechSourceNumbers 不收 script 体，
 * 因为它要区分「声明」和「注释」。这里专供「机制句的数字是否在实现里出现过」这条用。 */
function jsBareNumbers(html) {
  const out = new Set();
  const scripts = html.match(/<script[\s\S]*?<\/script>/gi) || [];
  for (const s of scripts) {
    for (const m of s.matchAll(/(?<![\w.])(\d*\.?\d+)(?![\w.])/g)) {
      const n = Number(m[1]);
      if (Number.isFinite(n)) out.add(n.toFixed(2));
    }
  }
  return out;
}

/* 语义名词：机制句里出现这些词，源码里必须真的用到了对应能力。
 * 只放**已经实测踩过坑**的词，不做禁词表 —— 禁词表是下一个 §9.15。 */
const MECH_VOCAB = ['焦距', '相位', '透印', '凹印'];
function mechVocabHits(mech) {
  return MECH_VOCAB.filter((w) => mech.includes(w));
}

/* 从 style.css 抽「真实声明过的」颜色（:root 变量 + 裸 hex），剥注释后 */
function cssColors(css) {
  const clean = stripCssComments(css);  return new Set(hexes(clean));
}

/* 抽 CSS 里真实声明的线宽。
 *
 * 口径必须与 `clean-dna.mjs` / `extract-dna.mjs` 的抽取保持一致，否则闸门会误报
 * 「提示词说的和 CSS 不符」。2026-10-30 第一版漏了四类，各误报一个案：
 *   ① `var(--x)` 变量 → S13 的 9px（用了 8 处）
 *   ② `column-rule`   → S07 的 0.5px
 *   ③ `stroke-width` 的 CSS 写法 → S27 的 3px / 1.6px
 *   ④ HTML 属性与 JS 计算值 → S03 的 1.2px / 1.5px
 * 漏掉一个就会指着正确的数据说它错。这个教训值得写在这里。
 *
 * ⚠️ 另有一条更根本的口径事实（EXEC-B 指出，我实测确认）：
 * **不要用「渲染实测」来验收 border 线宽，物理上对不上。**
 * Chrome 在 dpr=1 下把 `border-width` 量化成 `max(1, floor(w))`，不是四舍五入：
 *
 *   声明 0.35/0.4/0.5/0.6/0.8/1.1/1.2/1.25/1.4/1.5/1.6/1.7 → computed 全是 1px
 *   声明 2.4/2.5 → 2px    3.2/3.5/3.6 → 3px    5.5 → 5px    14.5 → 14px
 *   `stroke-width` 则**完全不量化**（28/28 原样）
 *
 * 实测（`deliverables/70-plan/LEAD-test-quantization.mjs`，28 档）：
 *   border: floor 吻合 28/28，round 吻合 20/28
 * 所以「提示词声称的值必须能在渲染里 ±0.05 找到」这个判据对 border 是错的。
 * **本闸门因此只做「源码对账」——读 `style.css` / `index.html` 的字面声明，
 * 不读 `getComputedStyle`。** 源码里写的是设计意图，那才是提示词该复述的东西；
 * 浏览器渲染成 1px 是实现细节。
 */
function cssLineWidths(css) {
  const clean = stripCssComments(css);
  const vars = parseRootVars(css);
  const out = new Set();
  // 覆盖 border / border-top / border-top-width / outline / outline-width / column-rule / stroke-width
  const PROP_RE = /(?:^|[;{\s])(border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|column-rule(?:-width)?|stroke-width)\s*:\s*([^;}]+)/g;
  for (const m of clean.matchAll(PROP_RE)) {
    const resolved = evalCalc(resolveVars(m[2], vars));
    /* `stroke-width` 是 SVG 属性，**单位可以省略**：`stroke-width: 1.1` 就是 1.1 用户单位。
     * 2026-10-30 第二版闸门漏了这一点，误报 S04 的 1.1px、S09 的 3.5/3.6px、
     * S11 的 1.25px 共 9 条 FAIL —— 全部是数据正确、闸门错。
     * 这是本轮第 3 个「工具口径比被测数据窄」的错误，记在这里。 */
    const isSvgWidth = /stroke-width$/i.test(m[1]);
    const w = isSvgWidth
      ? (resolved.match(/(?:^|\s)(\d*\.?\d+)(?:px)?\s*(?:$|[;}\s])/) || resolved.match(/(?:^|\s)(\d*\.?\d+)/))
      : resolved.match(/(?:^|\s)(\d*\.?\d+)px/);
    if (w && +w[1] > 0 && +w[1] <= 40) out.add(parseFloat(w[1]));
  }
  // HTML 里的 stroke-width 属性也写在这个函数里读不到，交给 htmlLineWidths
  return [...out].sort((a, b) => a - b);
}

/* HTML 里的 stroke-width 属性 */
function htmlLineWidths(html) {
  const out = new Set();
  for (const m of html.matchAll(/stroke-width\s*=\s*["']?(\d*\.?\d+)/g)) {
    if (+m[1] > 0 && +m[1] <= 40) out.add(+m[1]);
  }
  return [...out].sort((a, b) => a - b);
}

/* HTML 内联 <script> 里 JS 计算的 stroke-width。
 * 例如 S03 的 `line(..., major ? 1.5 : 1)` —— 1.5px 只在 JS 里，CSS 里没有。
 * 这是 clean-dna.mjs 已经处理的第九类来源，闸门也要跟。
 */
function jsLineWidths(html) {
  const out = new Set();
  // setAttribute("stroke-width", N)
  for (const m of html.matchAll(/setAttribute\(\s*["']stroke-width["']\s*,\s*([0-9.]+)/g)) {
    if (+m[1] > 0 && +m[1] <= 40) out.add(+m[1]);
  }
  // 三元/默认参里的候选值：xxx ? A : B —— 只取带 stroke/width/line 语境的
  for (const m of html.matchAll(/(?:major|minor|thin|thick|w)\s*\?\s*([0-9.]+)\s*:\s*([0-9.]+)/g)) {
    for (const v of [m[1], m[2]]) if (+v > 0 && +v <= 40) out.add(+v);
  }
  return [...out].sort((a, b) => a - b);
}

/* ── 检查项 ──────────────────────────────────────────────────────────── */
const findings = [];
const add = (level, id, rule, msg) => findings.push({ level, id, rule, msg });

const stats = {
  source: 'prototypes/_selection/prompts.js + prompt-copy.js vs prototypes/Sxx/style.css + index.html',
  cases: DIRS.length,
  promptLen: { min: 1e9, max: 0, median: 0 },
  paletteHexTotal: 0,
  fail: 0, warn: 0, pass: 0,
};

const lens = [];
const offPaletteAll = [];
const lwMismatch = [];

for (const d of DIRS) {
  const id = d.slice(0, 3);
  const css = readFileSync(join(PROTOS, d, 'style.css'), 'utf8');
  const html = readFileSync(join(PROTOS, d, 'index.html'), 'utf8');

  let text = '';
  if (typeof buildStylePrompt === 'function') {
    try { text = buildStylePrompt(id) || ''; } catch (e) { add('FAIL', id, 'prompt-build', `buildStylePrompt 抛错: ${e.message.slice(0, 100)}`); continue; }
  }
  if (!text || text.length < 500) {
    add('FAIL', id, 'prompt-missing', `提示词缺失或过短（${text.length} 字）`);
    continue;
  }
  lens.push(text.length);

  /* ── 1. 提示词里的色值 vs style.css 真实声明的色值 ────────────────────
   * 判据：提示词配色段列出的每个 hex，必须能在 style.css（剥注释后）里找到声明。
   * 反方向不查——CSS 里可以有大量派生色，提示词不必全列（那是设计选择）。
   */
  const palLine = text.match(/1\.\s*配色只用这几个值：([^\n]*)/);
  if (!palLine) {
    add('FAIL', id, 'palette-line', '找不到「配色只用这几个值」这一句');
  } else {
    const palHex = hexes(palLine[1]);
    stats.paletteHexTotal += palHex.length;
    const cssHex = cssColors(css);
    const htmlHex = new Set(hexes(stripCssComments(html)));
    const missing = palHex.filter((h) => !cssHex.has(h) && !htmlHex.has(h));
    if (missing.length) {
      add('FAIL', id, 'palette-not-in-css', `提示词列了 ${missing.length} 个 color，但 style.css/index.html 里查不到声明: ${missing.join(' ')}`);
    }
    if (palHex.length === 0) add('FAIL', id, 'palette-empty', '配色段一个 hex 都没有');
  }

  /* ── 2. 提示词里的线宽 vs CSS+HTML 真实声明的线宽 ────────────────────
   * 判据：提示词列的每一级必须真实存在（允许 ±0.02 误差）。
   * 反过来：CSS 里出现 ≥3 次的线宽也应在提示词里（出现次数需要渲染，这里只查存在性）。
   */
  const lwLine = text.match(/线宽只用这几级：([^，,\n]*)/);
  if (lwLine) {
    const claimed = (lwLine[1].match(/[\d.]+/g) || []).map(Number);
    const actualCss = cssLineWidths(css);
    const actualHtml = htmlLineWidths(html);
    const actualJs = jsLineWidths(html);
    const actualAll = [...new Set([...actualCss, ...actualHtml, ...actualJs])].sort((a, b) => a - b);
    const notInCss = claimed.filter((c) => !actualAll.some((a) => Math.abs(a - c) < 0.02));
    if (notInCss.length) {
      add('FAIL', id, 'linewidth-not-in-css', `提示词说线宽有 ${notInCss.join('、')}px，但 CSS/HTML 里查不到: 实际[${actualAll.join('、')}]`);
      lwMismatch.push({ id, claimed, actual: actualAll, notInCss });
    }
    // 措辞自相矛盾：列了 ≥3 级却说「不要自创第三级」
    if (claimed.length >= 3 && /不要自创第三级/.test(text)) {
      add('WARN', id, 'linewidth-wording', `列了 ${claimed.length} 级（${claimed.join('、')}）却说「不要自创第三级」`);
    }
  }

  /* ── 3. 配色段之外的 hex：只对**否定语境**报警 ────────────────────────
   *
   * 这条抓的是「提示词的否定句里点名禁色」。批判 Agent + 检索 Agent 都指出：
   * Semantic Gravity Wells（arXiv 2601.08070, n=40,000）实测 87.5% 的违规发生在
   * 「明确点名被禁词」时——「不要用 #6366F1」会**提高** AI 使用它的概率。
   *
   * 2026-10-30 首版对**所有**段外 hex 报警，30/30 全中；EXEC-B 把 8 条禁令改写成
   * 正向处方后降到 1 条（S25）。而 S25 那条是技术说明不是否定句：
   *
   *   「第三色由运行时的 mix-blend-mode: multiply 在两版相压处真算（构建期不固色），
   *     实测 #181C0D」
   *
   * 这是在描述**一个必须存在的派生色**，删掉它 AI 就不知道要用 multiply 真算而不是
   * 用 opacity 假装叠印。误报。
   *
   * 所以判据收紧为：只对「出现在否定词附近的 hex」报警。否定词取实际用到的那些，
   * 不含「实测 / 真算 / 由…算」这类技术说明语境。
   */
  const allHex = hexes(text);
  const palHexOnly = palLine ? hexes(palLine[1]) : [];
  const extra = allHex.filter((h) => !palHexOnly.includes(h));
  const NEG_RE = /(不要|禁止|避免|不得|反的是|不允许|别用|勿用|拒绝|规避)/;
  const suspicious = extra.filter((h) => {
    // 取该 hex 在全文里的每一处上下文，只要有任意一处落在否定语境附近就报
    let idx = -1;
    while ((idx = text.indexOf(h, idx + 1)) >= 0) {
      const win = text.slice(Math.max(0, idx - 40), idx + h.length + 40);
      if (NEG_RE.test(win)) return true;
    }
    return false;
  });
  if (suspicious.length) {
    add('WARN', id, 'hex-in-negative-context',
      `配色段之外有 ${suspicious.length} 个 hex 出现在否定语境里: ${suspicious.join(' ')}（按 arXiv 2601.08070 实测，点名禁词会提高 87.5% 的违规率 → 改写成正向处方）`);
  }
  // 段外但属技术说明的，单独记一条低优先提示，不计入 WARN 数
  const benign = extra.filter((h) => !suspicious.includes(h));
  if (benign.length) {
    add('INFO', id, 'hex-outside-palette-line',
      `配色段之外还有 ${benign.length} 个 hex，均为技术说明（派生色/混合结果），不是否定句: ${benign.join(' ')}`);
  }

  /* ── 4. 字号：提示词是否给了任何排版尺度信息 ──────────────────────────
   * 本轮实测：h1Size 进了提示词的案 = 0/30（prompt-copy.js:284 在死分支里）。
   * 这条只报 WARN，因为「该不该给字号」本身是个待裁决的设计问题。
   */
  if (!/字号|字阶|最大标题|主标题取|font-size/.test(text)) {
    add('WARN', id, 'no-typescale', '提示词没有任何字号/字阶信息');
  }

  /* ── 5. 机制句的数值 vs style.css / index.html（2026-11-04 加）────────
   * 见 mechSourceNumbers 上方的长注释。三档判定：声明侧 PASS / 仅注释 WARN / 都没有 FAIL。
   *
   * ⚠️ 机制句要从 `STYLE_PROMPTS.schemes[i].dna.mechanism` 取 —— `d` 是**目录名字符串**，
   * 不是案件对象。第一版这里写成 `d.mechanism` 得到 undefined，整块断言静默跳过，
   * 闸门照样打印「FAIL 0」。那是本仓库反复在治的病（闸门看起来绿、其实没跑），
   * 所以下面加了一条 `mech-empty` 断言：30 案里任何一案取不到机制句都要报，不许静默。
   */
  const mechEntry = ((STYLE_PROMPTS && STYLE_PROMPTS.schemes) || []).find((x) => x.id === id);
  const mech = ((mechEntry && mechEntry.dna && mechEntry.dna.mechanism) || '').trim();
  if (!mech) {
    add('FAIL', id, 'mech-empty', '取不到 dna.mechanism（STYLE_PROMPTS.schemes 里没有该案，或 dna.mechanism 为空）');
  }
  if (mech) {
    const vars = parseRootVars(css);
    /* 声明侧：剥掉 CSS 注释 + HTML 注释 + <script> 体 */
    const declSrc = stripCssComments(css) + '\n' +
      stripCssComments(html.replace(/<script[\s\S]*?<\/script>/gi, ' '));
    /* 注释侧：只取注释体 */
    const commSrc = (css.match(/\/\*[\s\S]*?\*\//g) || []).join('\n') + '\n' +
      (html.match(/<!--[\s\S]*?-->/g) || []).join('\n');
    const decl = mechSourceNumbers(declSrc, vars);
    const comm = mechSourceNumbers(commSrc, vars);
    /* JS 里算出来的量（S03 的 1.5 / 0.5 这类）。见 jsBareNumbers 的注释：
     * 这条放宽是为了不让「机制句正确但值在 JS 里」被误判。 */
    const jsNums = jsBareNumbers(html);

    for (const m of mech.matchAll(MECH_TOKEN_RE)) {
      const raw = m[0].trim();
      const val = Number(m[1]).toFixed(2);
      const isPct = m[2] === '%';
      const inDecl = isPct ? decl.pct.has(val) : decl.len.has(val);
      if (inDecl) continue;
      const inComm = isPct ? comm.pct.has(val) : comm.len.has(val);
      if (inComm) {
        /* 仅在注释里：说明这个值是从代码/滤镜参数反推的推导值，实现里没有对应声明。
           这是 WARN 不是 FAIL —— 它没错，但也没有声明在守护它。文案必须说清这一点，
           否则下一个人会去改正确的数字。 */
        add('WARN', id, 'mech-value-comment-only',
          `机制句的「${raw}」只在该案注释里找到（不是声明）。它是推导值，没有声明佐证 —— 不是错，但也没被守护`);
      } else if (jsNums.has(val)) {
        /* 值在 <script> 体里出现过（S03 的 `major ? 1.5 : 1`、`rel * 0.5`）。
           它确实在实现里，只是不是一条 CSS 声明。同样降 WARN，理由同上。 */
        add('WARN', id, 'mech-value-in-script-only',
          `机制句的「${raw}」只在该案 <script> 体里出现（JS 算出来的量，不是 CSS 声明）`);
      } else {
        add('FAIL', id, 'mech-value-not-in-source',
          `机制句的「${raw}」在该案 style.css / index.html（声明侧与注释侧）都找不到`);
      }
    }

    /* 语义词：机制句提到某工艺，源码里必须有对应实现（S03「焦距」是唯一的现存违规） */
    for (const w of mechVocabHits(mech)) {
      const all = declSrc + '\n' + commSrc + '\n' + (d.appjs || '');
      let has = all.includes(w);
      if (!has) {
        /* app.js 可能单独成文件（S07），补读一次 */
        try { has = readFileSync(join(PROTOS, d, 'app.js'), 'utf8').includes(w); } catch { /* 没有就算了 */ }
      }
      if (!has) {
        add('FAIL', id, 'mech-vocab-unimplemented',
          `机制句用了「${w}」，但该案 style.css / index.html / app.js 里没有这个概念的实现`);
      }
    }
  }

  /* 机制句里每个「N 栏 / N 列」都打印成 INFO —— **不判定对错**，只让人看见。
   * 为什么不断言：S03「9 栏」、S07「5 栏对 7 栏」这类是**量纲错配**，数字真实存在于
   * `5fr 1px 7fr` 里，任何存在性检查都抓不到；而硬去数 `column-count`/`repeat(N)` 会产生
   * 大量误报（`栏` 在 CSS 里是区间 `grid-column:1/9` 或 DOM 节点计数，不是值）。
   * 实测把「栏/行/层」纳入断言 → 32 条 FAIL，绝大多数是误报。
   * 所以这里只做一件事：**让这类数字在每次跑闸门时出现在人眼前**，
   * 而不是假装它被守住了。人工改文案的清单在 `deliverables/74-w4/00-EXECUTION-PLAN.md`。 */
  if (mech) {
    const colClaims = [...mech.matchAll(/(\d+)\s*[栏列]/g)].map((m) => m[0]);
    if (colClaims.length) {
      add('INFO', id, 'mech-column-claim-unchecked',
        `机制句里的栏/列声明未自动核对（量纲错配无法用存在性检查捕获）：${colClaims.join(' ')}`);
    }
  }

  stats.pass++;
}

/* ── 全局检查 ────────────────────────────────────────────────────────── */

/* A. 30 条提示词必须全部生成成功 */
if (lens.length !== DIRS.length) {
  add('FAIL', '*', 'coverage', `只生成了 ${lens.length}/${DIRS.length} 条提示词`);
}

/* B. 长度区间（README 与 check-docs 声称 1639–1998，中位 1829） */
lens.sort((a, b) => a - b);
if (lens.length) {
  stats.promptLen = { min: lens[0], max: lens[lens.length - 1], median: lens[Math.floor(lens.length / 2)] };
}

/* C. 每条提示词必须包含模板骨架的关键句（防止模板被改坏） */
const REQUIRED_MARKERS = [
  { re: /我经营＿+。/, name: '留白填空' },
  { re: /视觉硬约束/, name: '视觉硬约束段' },
  { re: /结构约束/, name: '结构约束段' },
  { re: /输出要求：只给一个完整单文件 HTML/, name: '输出要求段' },
];
for (const d of DIRS) {
  const id = d.slice(0, 3);
  if (typeof buildStylePrompt !== 'function') break;
  let t = '';
  try { t = buildStylePrompt(id) || ''; } catch { continue; }
  for (const m of REQUIRED_MARKERS) {
    if (!m.re.test(t)) add('FAIL', id, 'template-marker', `缺少模板骨架「${m.name}」`);
  }
}

/* D. 产物陈旧度：prompts.js 是 dna-clean.json 的生成物，两者必须同步
 *
 * 为什么需要它：2026-10-30 实测——执行 Agent 把 dna-clean.json 的 h1Size
 * 从 "" / "var(--fs-h1)" 修成具体值（7/30 案），但没有重跑 build-prompts.mjs，
 * 于是 prompts.js 仍停留在旧值。这期间用户复制到的提示词与数据源不一致，
 * 而当时 check-stale.mjs 只看原型不看这条链、check-docs.mjs 只看 README。
 *
 * 判据：读 dna-clean.json 的每个字段，与 prompts.js 里 window.STYLE_PROMPTS
 * 对应案的字段逐项比对。只比对 prompts.js 顶层的案对象（不含 sceneIndex 等索引表）。
 */
{
  const cleanRaw = readFileSync(join(ROOT, 'prototypes/_prompts/dna-clean.json'), 'utf8');
  const cleanArr0 = JSON.parse(cleanRaw);
  const cleanArr = Array.isArray(cleanArr0) ? cleanArr0 : Object.values(cleanArr0);
  const cleanById = new Map(cleanArr.map((e) => [e.id, e]));

  // STYLE_PROMPTS.schemes 是 30 个案对象的数组；每个案的 DNA 字段嵌在 `.dna` 下。
  const KEY_FIELDS = ['h1Size', 'lineWidths', 'radius', 'shadow'];
  const schemes = Array.isArray(STYLE_PROMPTS?.schemes) ? STYLE_PROMPTS.schemes : [];
  let staleCases = 0;
  for (const sp of schemes) {
    const id = sp.id;
    const dc = cleanById.get(id);
    if (!dc) continue;
    const dna = sp.dna || {};
    for (const f of KEY_FIELDS) {
      const a = dc[f];
      const b = dna[f];
      if (a === undefined || b === undefined) continue;
      if (String(a) !== String(b)) {
        add('FAIL', id, 'stale-vs-dna-clean',
          `${f} 不一致: dna-clean=${JSON.stringify(a)} / prompts.js=${JSON.stringify(b)} → 重跑 node prototypes/_prompts/build-prompts.mjs`);
        staleCases++;
        break;
      }
    }
  }
  if (staleCases) {
    add('FAIL', '*', 'stale-summary', `共 ${staleCases}/30 案的 prompts.js 落后于 dna-clean.json`);
  }
}

/* ── 输出 ─────────────────────────────────────────────────────────────── */
const FAILS = findings.filter((f) => f.level === 'FAIL');
const WARNS = findings.filter((f) => f.level === 'WARN');
stats.fail = FAILS.length;
stats.warn = WARNS.length;

if (JSON_OUT) {
  console.log(JSON.stringify({ stats, findings }, null, 2));
} else {
  console.log(`提示词闸门：检查 ${DIRS.length} 条提示词（源: ${stats.source}）`);
  console.log(`  长度 ${stats.promptLen.min}–${stats.promptLen.max}，中位 ${stats.promptLen.median}  配色段 hex 合计 ${stats.paletteHexTotal}`);
  console.log('');

  const byRule = new Map();
  for (const f of findings) {
    const k = `${f.level}|${f.rule}`;
    if (!byRule.has(k)) byRule.set(k, []);
    byRule.get(k).push(f);
  }

  if (!QUIET || FAILS.length) {
    for (const [k, list] of [...byRule.entries()].sort()) {
      const [level, rule] = k.split('|');
      if (QUIET && level !== 'FAIL') continue;
      // INFO 是「记一笔但不要求动作」，只在非 quiet 模式显示，用 · 标记
      const mark = level === 'FAIL' ? '✗' : level === 'WARN' ? '~' : '·';
      console.log(`${mark} [${rule}] ${list.length} 条${level === 'INFO' ? '（信息，不需动作）' : ''}`);
      for (const f of list.slice(0, QUIET ? 3 : 40)) {
        console.log(`    ${f.id}  ${f.msg}`);
      }
      if (list.length > (QUIET ? 3 : 40)) console.log(`    … 其余 ${list.length - (QUIET ? 3 : 40)} 条同规则`);
    }
    console.log('');
  }

  console.log(`合计 FAIL ${stats.fail} / WARN ${stats.warn}`);
}

process.exit(FAILS.length ? 1 : 0);
