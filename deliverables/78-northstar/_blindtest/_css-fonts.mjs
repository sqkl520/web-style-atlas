/* 读 CSS 字体声明的公共实现 —— 这个仓库里已经有四份复制品了，收成一份。
 *
 * 【为什么必须收】
 * 2026-11-23 一天之内，同一个坑踩了三次：
 *   ① `_repeatability.mjs` 第一版：自己写「取 font-family 第一个族名」，
 *      遇到 `font-family: var(--title)` 抽到的是 `var(--title)`，于是
 *      S21-r3 的 fontN=0，与 r2 的 3 个不同，报「字体集合不一致」—— 假阳性。
 *   ② 改用 `score.mjs` 的 `judgeFontChain`，结果它**也不展开 var**，
 *      返回 `used: []` + `undecided: true` —— 还是假阳性。
 *   ③ 一段临时 shell 检查用 `/font-family[^;}]+,[^;}]+/` 判「有没有链」，
 *      报「18 份两者都没有」。展开后 S13/S15/S34-r3 都是完整的 4 族链。
 *
 * 三次都发生在**新写的代码**里，而不是已经有展开逻辑的那几处。
 * 说明问题不是「不知道要展开」，是**每次写新代码时都会忘**。
 * 那唯一可靠的解法就是：让它只有一个实现。
 *
 * 【为什么放在这里】
 * 放在 `_blindtest/` 下而不是 `_probe/` 下，因为 `score.mjs` 在那边，
 * 而 prod 链（`clean-dna.mjs`）用的是自己那套（它有更复杂的需求：
 * 从 h1 规则反查、按变量名语义排序）。这里只服务**研究线**。
 *
 * ── 2026-11-23/24 审计后补的九处修正（A3 审计，每处都有反例）────────────
 *
 * A. **`@font-face` 是定义，不是使用**。原实现把 `@font-face{font-family:"A"}`
 *    当成一条使用，于是「定义了 A 但一次都没用」会被算成用了 A。
 *    实测影响：`_font-fallback-chain` 的「有退路」率正确值是 87%（33/38），
 *    把定义也算进去时掉到 79%（30/38）—— S04-r2 / S16 / S18 三份
 *    被自己的 `@font-face` 单族定义撑成了「有退路」。
 *
 * B. **`font:` 简写里有字族**。原实现只认 `font-family:`，完全看不见
 *    `font:12px/1 "IBM Plex Mono",Consolas,monospace`。实测 S03-r2 有 18 处
 *    简写（它的 `font-family:` 只有 3 条）、S16 有效 2 处（另有 1 处 `font:inherit`）、
 *    S18 2 处，原实现从这些声明里一个族名都读不到。
 *
 * C. **引号里的逗号不是分隔符**。`"Foo, Bar", serif` 用 `split(',')` 会切成
 *    两个假族名。实测 73 份样本 0 处命中，但只要换一批产物就会踩 ——
 *    字体名里带逗号是真实存在的写法（如 "Noto Sans, Fallback"）。
 *
 * D. **`!important` 不是族名的一部分**。`font-family:"A", serif !important`
 *    会把最后一个族名读成 `serif !important`，链长仍然对，族名错。
 *
 * E. **HTML 属性里的 `--x:` 不是 CSS 变量**。`cssVariables` 原来对整份 HTML
 *    跑正则，会跨标签吃进 `--dot-shift: 4px" data-index="05">…` 这种垃圾值
 *    （实测 S16 命中）。现在先切出 CSS 上下文（`<style>` 块与 `style=""`）。
 *
 * F. **没闭合的 `var(` 不能静默吞掉整条声明**。原实现配对循环走到串尾，
 *    返回空串，调用方看到的是「这条声明没有字族」，而不是「这里坏了」。
 *
 * G. **`font-family: inherit` 不是「0 族链」**。原实现让它产出空数组，
 *    消费方按「链长 < 2 = 无退路」统计，于是「继承」被报成「无退路」。
 *    实测 6 个原型因此被误报（S01×2 S07 S09 S13 S15×2）—— 原型是正对照，
 *    合格样品被判违规即判据错。现在关键字声明不产出条目（`isKeywordDeclaration`）。
 *
 * H. **CSS 属性名与函数名大小写不敏感**。`FONT-FAMILY:` / `VAR()` / `Font:`
 *    都是合法写法；原实现只匹配小写，`font-family:VAR(--f)` 会把
 *    字符串 `VAR(--f)` 当成族名计入统计。
 *
 * I. **「是 HTML 吗」不能只看有没有 `style=` 字样**。第一版用
 *    `/<style[\s>]|style\s*=\s*["']/` 判上下文，于是纯 CSS 文件里只要出现
 *    `content:'<style>'` 或注释里的示例，整份 CSS 就被切成 0 字符 ——
 *    实测 `prototypes/_selection/style.css`（69 566 B）读到 0 B。现在要求
 *    结构信号（`<!doctype html` / `<html` / `<body` / `</style>` 或成对的
 *    `<style>…</style>`）才按 HTML 处理。
 *
 * 用法：
 *   import { fontChains, chainOf, firstFamilies } from './_css-fonts.mjs';
 *   const decls = fontDeclarations(html);   // ['"Noto Serif SC", Georgia, serif', ...]（只含使用）
 *   const fams = chainOf(decls[0], cssVariables(html));
 *   fontChains(html);      // 一次拿到所有使用声明的族名数组
 *   firstFamilies(html);   // 每条使用声明的首族（去重前）
 */

const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;

/** 剥 CSS 注释。必须先剥 —— S13 的注释里有 `monospace` 三个字，
 *  不剥会被当成声明（2026-11-22 实测）。 */
export function stripCssComments(s) {
  return String(s || '').replace(CSS_COMMENT, '');
}

/** 从「HTML」或「纯 CSS」里取出真正属于 CSS 的文本。
 *
 *  - 输入是 HTML → 只取 `<style>` 内容与 `style="…"` 属性的值，拼在一起。
 *  - 输入是纯 CSS → 原样返回。
 *
 * 为什么必须区分：CSS 变量正则在整份 HTML 上跑会跨标签匹配，
 * 把 `--dot-shift: 4px" data-index="05"> <span class="mono">…` 变成变量值。
 * 实测 S16 的 `--dot-shift` 就是这样吃进半页 HTML 的。
 *
 * ⚠️ 判断「是不是 HTML」不能只看有没有 `style=` / `<style` 这几个字 ——
 * **CSS 文件里也会出现它们**（`content:'<style>'`、注释里的示例）。
 * 第一版就是这么写的，实测 `prototypes/_selection/style.css`（69 KB）
 * 被判成 HTML 后切出 0 字符，整份 CSS 静默消失。
 *
 * 现在的判据分两步，都要过：
 *   ① 结构信号：`<!doctype` / `<html` / `<body` / `</style>` 这类**只能**出现在
 *      标记语言里的串；
 *   ② 或者「`<style>` 起始标签后面确实跟着 `</style>`」这种成对结构。
 * 光是 `style="` 或孤立的 `<style>` 不够 —— 单独出现时按纯 CSS 处理，
 * 最坏结果是多读一点，不会少读。
 */
export function cssText(src) {
  const s = String(src || '');
  const looksHtml = /<!doctype\s+html|<html[\s>]|<body[\s>]|<\/style\s*>/i.test(s)
    || /<style[^>]*>[\s\S]*?<\/style\s*>/i.test(s);
  if (!looksHtml) return s;
  const parts = [];
  for (const m of s.matchAll(/<style[^>]*>([\s\S]*?)<\/style\s*>/gi)) parts.push(m[1]);
  for (const m of s.matchAll(/\bstyle\s*=\s*(["'])([\s\S]*?)\1/gi)) parts.push(m[2]);
  return parts.join('\n;\n');
}

/** 建变量表。后出现的定义覆盖前面的（与 CSS 层叠一致的**近似** ——
 *  其实层叠是按选择器作用域的，这里只做全局最后一条。见 `varConflicts`。 */
export function cssVariables(src) {
  const vars = Object.create(null);
  for (const m of cssText(stripCssComments(src)).matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

/** 同名变量被定义了不止一种值 → 返回 { name: [值…] }。
 *
 * 这是 `cssVariables` 「最后一条胜」这个近似的**可见化**：如果某个字体变量
 * 在 `:root` 和 `.dark`（或 media query）里给了两个不同的值，哪个生效取决于
 * 元素所在的作用域，静态文本读不出来。调用方拿到非空结果时应当记「未判」，
 * 而不是假装最后一条就是全站生效值。实测 73 份样本里字体相关变量冲突 0 处。 */
export function varConflicts(src) {
  const seen = new Map();
  for (const m of cssText(stripCssComments(src)).matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
    const k = m[1], v = m[2].trim();
    if (!seen.has(k)) seen.set(k, new Set());
    seen.get(k).add(v);
  }
  const out = {};
  for (const [k, set] of seen) if (set.size > 1) out[k] = [...set];
  return out;
}

/** 递归展开 var()，深度上限 6（这个仓库最深的嵌套是 3 层）。
 *
 * ⚠️ 两个容易写错的地方，都在这里踩过：
 *
 * ① **fallback 里可能还有 var()**。`var(--a, var(--b))` 的第一版正则写成
 *    `(?:,\s*([^()]*))?` —— `[^()]` 不允许括号，于是嵌套 fallback 匹配失败，
 *    `var(--b, var(--c))` 原样留在结果里。实测：`--a: var(--b, var(--c))`、
 *    `--c: Georgia`，展开 `var(--a), serif` 得到 `var(--b, Georgia), serif`
 *    而不是 `Georgia, serif`。
 *    修法是**先按括号配对切出 fallback**，再对 fallback 递归展开。
 *
 * ② 变量没定义时返回空串，而不是保留 `var(...)`。保留的话调用方看到的
 *    是「一个族名 `var(--x)`」，会当成真族名参与统计。
 *
 * ③ 没闭合的 `var(`：原实现把 `i = j` 推到串尾，整段被吞掉。现在剩余部分
 *    原样留在结果里（`chainOf` 会把它滤掉，但 `fontDeclarations` 的调用方
 *    能看到原文，不会误以为「这里没写东西」）。 */
export function expandVars(value, vars, depth = 0) {
  if (depth > 6) return value;
  const s = String(value || '');
  let out = '';
  let i = 0;
  while (i < s.length) {
    /* CSS 函数名与属性名**大小写不敏感**（`VAR()` 合法）。
     * 第一版只找小写 `var(`，`font-family:VAR(--f)` 会原样留在结果里，
     * 再被 `chainOf` 当成族名 `VAR(--f)` 计入统计。 */
    const at = s.toLowerCase().indexOf('var(', i);
    if (at < 0) { out += s.slice(i); break; }
    out += s.slice(i, at);
    /* 从 `var(` 开始做括号配对，切出完整实参 */
    let j = at + 4, lvl = 1;
    while (j < s.length && lvl > 0) {
      if (s[j] === '(') lvl++;
      else if (s[j] === ')') lvl--;
      j++;
    }
    if (lvl > 0) {                 // ③ 没闭合：原样保留剩余文本，不吞
      out += s.slice(at);
      break;
    }
    const inner = s.slice(at + 4, j - 1);   // 不含最外层括号
    /* 实参可能是 `--name` 或 `--name, fallback`。逗号要按顶层切，
     * 因为 fallback 自己可能含逗号（`var(--a, Georgia, serif)`）。 */
    let k = 0, d = 0, comma = -1;
    for (; k < inner.length; k++) {
      if (inner[k] === '(') d++;
      else if (inner[k] === ')') d--;
      else if (inner[k] === ',' && d === 0) { comma = k; break; }
    }
    const name = (comma < 0 ? inner : inner.slice(0, comma)).trim();
    const fb = comma < 0 ? null : inner.slice(comma + 1);
    if (vars && vars[name] !== undefined) {
      out += expandVars(vars[name], vars, depth + 1);
    } else if (fb !== null) {
      out += expandVars(fb, vars, depth + 1);
    }
    /* 变量没定义且无 fallback → 什么都不加（返回空） */
    i = j;
  }
  return out;
}

/** 按**顶层逗号**切字族列表。引号内的逗号不是分隔符（修正 C）。 */
export function splitFamilies(value) {
  const s = String(value || '');
  const out = [];
  let cur = '';
  let quote = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      cur += ch;
      if (ch === quote && s[i - 1] !== '\\') quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
    } else if (ch === ',') {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out.filter(Boolean);
}

/** 去掉一条声明值尾部的 `!important`（修正 D）。 */
function stripImportant(v) {
  return String(v || '').replace(/!\s*important\s*$/i, '').trim();
}

/** CSS 关键字不是族名，必须排掉：
 *   inherit / initial / unset / revert —— 它们表示「继承」或「重置」，
 *   不是字体。留着会让链长虚增 1，正好抵消掉「无退路」那个判据的准确性。 */
const CSS_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);

/* 系统字体简写关键字：`font: menu`。它们不是字族，而是一个完整简写。 */
const SYSTEM_FONT_KEYWORDS = new Set([
  'caption', 'icon', 'menu', 'message-box', 'small-caption', 'status-bar',
]);

/** 一条 font-family 的值 → 族名数组（去引号、去空、**不滤通用族**）。
 *
 * ⚠️ 不滤通用族是刻意的。`_font-fallback-chain.mjs` 曾经在数长度之前
 * 把 `serif`/`monospace` 滤掉，于是 `"Martian Mono", ui-monospace, monospace`
 * 被算成「只有 1 个族」→ 报「38 份里 37 份链太短」。
 * 而 5 个原型自己就是这样 —— 按正对照原则，那是判据错，不是产物错。
 *
 * 需要「实名族」的调用方请自己再过滤，不要在这里统一滤 —— 因为
 * 「通用族算不算兜底」取决于上下文（等宽链算，正文链不算气质）。 */
export function chainOf(value, vars) {
  const expanded = vars ? expandVars(stripImportant(value), vars) : String(stripImportant(value) || '');
  return splitFamilies(expanded)
    .map((x) => x.trim().replace(/^["']|["']$/g, '').trim())
    .filter((x) => x && !/^var\(/i.test(x) && !CSS_KEYWORDS.has(x.toLowerCase()));
}

/** `font:` 简写的值 → 字族列表的**原始串**（未展开变量），失败返回 ''。
 *
 * 简写语法：`[style||variant||weight||stretch]* size[/line-height] family-list`。
 * 做法是按空白切词（尊重引号与括号），找到 size 词的位置，后面那段就是字族。
 * 这样不会把 `italic`/`700`/`small-caps` 之类误当成族名。
 *
 * 边界：
 *  - `font: inherit` / `font: menu` → ''（不是字族声明）
 *  - `font: 12px/1.5 "A", serif` → `"A", serif`（size 与 line-height 连写）
 *  - `font: 12px / 1.5 "A"` → `"A"`（分开写）
 *  - `font: var(--f)` → 没有 size，判不出 → ''（宁可漏，不猜） */
export function shorthandFamilies(value) {
  const raw = stripImportant(value);
  if (!raw) return '';
  if (CSS_KEYWORDS.has(raw.toLowerCase()) || SYSTEM_FONT_KEYWORDS.has(raw.toLowerCase())) return '';

  /* 切词：尊重引号和括号，空白只在顶层切。 */
  const toks = [];
  let cur = '', quote = null, depth = 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (quote) {
      cur += ch;
      if (ch === quote && raw[i - 1] !== '\\') quote = null;
    } else if (ch === '"' || ch === "'") { quote = ch; cur += ch; }
    else if (ch === '(') { depth++; cur += ch; }
    else if (ch === ')') { depth = Math.max(0, depth - 1); cur += ch; }
    else if (/\s/.test(ch) && depth === 0) { if (cur) { toks.push(cur); cur = ''; } }
    else cur += ch;
  }
  if (cur) toks.push(cur);

  const SIZE = /^(?:(?:[+-]?(?:\d+\.?\d*|\.\d+)(?:px|em|rem|%|pt|pc|ex|ch|vw|vh|vmin|vmax|cm|mm|in|q|cap|ic|lh|rlh)|xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large|larger|smaller)(?:\/[^\s]*)?|(?:calc|min|max|clamp|var)\([\s\S]*\)(?:\/[^\s]*)?)$/i;
  let idx = -1;
  for (let i = 0; i < toks.length; i++) if (SIZE.test(toks[i])) { idx = i; break; }
  if (idx < 0) return '';
  let rest = toks.slice(idx + 1);
  /* size 与 line-height 分开写：`12px / 1.5 "A"` */
  if (rest.length && /^\/$/.test(rest[0])) rest = rest.slice(2);
  else if (rest.length && /^\/\S+/.test(rest[0])) rest = rest.slice(1);
  return rest.join(' ').trim();
}

/** 一条 `font` 简写的值 → 族名数组。 */
export function shorthandChain(value, vars) {
  const fam = shorthandFamilies(value);
  return fam ? chainOf(fam, vars) : [];
}

/** 从 `start` 起扫一条声明的值，停在**顶层的** `;` 或 `}`。
 *
 * 为什么不能用 `([^;}]+)`（修正 G，2026-11-24 A2 夹具 13 号）：
 * `font-family:"A;B", serif` 里的 `;` 在引号内，它不是分隔符。
 * 用字符类切会在那里截断，得到 `"A` —— 这不是「切错族名」，
 * 是**整条值被腰斩**，族数从 2 掉到 1。语料 0 处，但形态是静默的。
 *
 * 括号也要算进去：`font-family:var(--a, var(--b))` 里的 `;` 若出现在
 * 函数实参里同样不是分隔符（虽然 CSS 里罕见，但 `url(data:...;base64,...)`
 * 天天有 —— 那个 `;` 会让 `@font-face` 的 `src` 被腰斩）。 */
function scanDeclValue(s, start) {
  let quote = null, depth = 0, i = start;
  for (; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      if (ch === quote && s[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '(') { depth++; continue; }
    if (ch === ')') { depth = Math.max(0, depth - 1); continue; }
    if (depth === 0 && (ch === ';' || ch === '}')) break;
  }
  return s.slice(start, i);
}

/** 去掉 `@font-face` 块（修正 A：定义不是使用）。
 *
 * ⚠️ 用**花括号配对**，不用 `@font-face[^{]*\{[^{}]*\}`（修正 H，夹具 16 号）。
 * 那条正则一旦块内出现花括号就配不上，定义会漏出来变成一条使用链。
 * 实测触发形态：`src:url(data:font/woff2;base64,{AA})`（data URI 里带花括号）。
 * 语料 0 处，但同一段代码决定「@font-face 里有嵌套块时怎么办」——
 * 配不上就是静默多算一条链，而多算的方向正好是**抬高**「有退路」的比例。 */
export function stripFontFaceRules(css) {
  const s = String(css || '');
  let out = '', i = 0;
  const re = /@font-face\b/gi;
  let m;
  while ((m = re.exec(s))) {
    out += s.slice(i, m.index);
    const b = s.indexOf('{', m.index + m[0].length);
    if (b < 0) { out += s.slice(m.index); return out; }
    let lvl = 0, j = b;
    for (; j < s.length; j++) {
      if (s[j] === '{') lvl++;
      else if (s[j] === '}') { lvl--; if (lvl === 0) { j++; break; } }
    }
    /* 用空格占位，保持偏移量不变 —— 调用方可能在用 index 做定位。 */
    out += ' '.repeat(j - m.index);
    i = j;
    re.lastIndex = j;
  }
  out += s.slice(i);
  return out;
}

/** 从整份 HTML/CSS 里抽出所有 **font-family 使用声明** 的值。
 *
 * 不含 `@font-face` 里的定义，也不含 `font:` 简写 —— 后者见 `shorthandDeclarations`
 * 与 `fontChains`。已剥注释，未展开变量。
 *
 * ⚠️ 两条左边界都是必需的（修正 I，夹具 15/25 号）：
 *   `(?<![-\w])` 排除 `--font-family:`（自定义属性定义）与
 *   `my-font-family:`（未知属性）。没有它，`:root{--font-family:"A",serif}`
 *   会被当成一条**使用**，凭空多一条链 —— 而多算的方向是抬高「有退路」。
 *   同一个左边界坑在 `--font-num` / `--num` 上已经踩过一次（79 审计 §四十五）。 */
export function fontDeclarations(src) {
  const css = stripFontFaceRules(cssText(stripCssComments(src)));
  const out = [];
  const re = /(?<![-\w])font-family\s*:/gi;
  let m;
  while ((m = re.exec(css))) out.push(stripImportant(scanDeclValue(css, re.lastIndex)));
  return out;
}

/** 从整份 HTML/CSS 里抽出所有 `font:` 简写的值（不含 @font-face）。 */
export function shorthandDeclarations(src) {
  const css = stripFontFaceRules(cssText(stripCssComments(src)));
  const out = [];
  const re = /(?<![-\w])font\s*:/gi;
  let m;
  while ((m = re.exec(css))) {
    const v = stripImportant(scanDeclValue(css, re.lastIndex));
    /* `font-family:` / `font-size:` 等不会被上面的 `font\s*:` 命中（它们是 `font-`），
     * 这个过滤器是第二道保险：万一将来有人放宽正则，别让长属性名漏进来。 */
    if (/^(?:font-family|font-style|font-weight|font-size|font-stretch|font-variant)\b/i.test(v)) continue;
    out.push(v);
  }
  return out;
}

/** 这条声明值**只有 CSS 关键字**（inherit / initial / unset / revert）。
 *  它不是字族声明 —— 它表示「不在这里声明字族」。
 *  与 `font:inherit` 的处理必须一致：都不产出族名条目。 */
export function isKeywordDeclaration(value) {
  const parts = splitFamilies(stripImportant(value))
    .map((x) => x.trim().replace(/^["']|["']$/g, '').toLowerCase())
    .filter(Boolean);
  return parts.length > 0 && parts.every((p) => CSS_KEYWORDS.has(p));
}

/** 抽出所有 `font-family: <关键字>` 声明（叫 view CSP 的调用方用来记「未判」）。 */
export function keywordDeclarations(src) {
  const css = stripFontFaceRules(cssText(stripCssComments(src)));
  return [...css.matchAll(/font-family\s*:\s*([^;}]+)/gi)]
    .map((m) => stripImportant(m[1]))
    .filter(isKeywordDeclaration);
}

/** 一步到位：给定 HTML/CSS，返回每条**使用**声明的族名数组。
 *
 *  默认把 `font:` 简写也算进来（`opts.shorthand === false` 可关）。
 *  **不是字族声明的值一律不产出条目**：
 *    · `font:inherit` / `font:menu`      → 简写里没有字族
 *    · `font-family:inherit` 等关键字     → 见 `isKeywordDeclaration`
 *  之前 `font-family:inherit` 会产出空链，消费方按「链长 0」统计，
 *  等于把「继承」误报成「无退路」。实测 6 个原型因此被误报
 *  （S01×2 S07 S09 S13 S15×2）—— 而原型是正对照。
 *
 *  但 `font-family: var(--未定义)` **仍产出空数组**：那是「读不到」，
 *  调用方需要它来判断「未判」，不能静默丢掉。
 *
 *  这是最常见的用法，调用方基本不需要别的。 */
export function fontChains(src, opts = {}) {
  const css = stripCssComments(src);
  const vars = cssVariables(css);
  const chains = fontDeclarations(css)
    .filter((v) => !isKeywordDeclaration(v))
    .map((v) => chainOf(v, vars));
  if (opts.shorthand !== false) {
    for (const v of shorthandDeclarations(css)) {
      const fam = shorthandFamilies(v);
      if (!fam) continue;               // `font:inherit` / `font:menu`：不是字族声明
      chains.push(chainOf(fam, vars));
    }
  }
  return chains;
}

/** 每条使用声明的首族（未去重、未滤通用族）。 */
export function firstFamilies(src) {
  return fontChains(src).map((c) => c[0]).filter(Boolean);
}

/** 这条声明有没有「退路」—— 长度 ≥ 2 就算有（第二个可以就是通用族）。
 *  见 `chainOf` 的注释：这里不判「实名族够不够」。 */
export function hasFallback(chain) {
  return Array.isArray(chain) && chain.length >= 2;
}