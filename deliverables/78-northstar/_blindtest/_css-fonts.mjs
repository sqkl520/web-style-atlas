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
 * 用法：
 *   import { fontDeclarations, chainOf, firstFamily } from './_css-fonts.mjs';
 *   const decls = fontDeclarations(html);   // ['"Noto Serif SC", Georgia, serif', ...]
 *   const fams = chainOf(decls[0]);         // ['Noto Serif SC', 'Georgia', 'serif']
 */

const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;

/** 剥 CSS 注释。必须先剥 —— S13 的注释里有 `monospace` 三个字，
 *  不剥会被当成声明（2026-11-22 实测）。 */
export function stripCssComments(s) {
  return String(s || '').replace(CSS_COMMENT, '');
}

/** 建变量表。后出现的定义覆盖前面的（与 CSS 层叠一致）。 */
export function cssVariables(css) {
  const vars = {};
  for (const m of String(css || '').matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
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
 */
export function expandVars(value, vars, depth = 0) {
  if (depth > 6) return value;
  const s = String(value || '');
  let out = '';
  let i = 0;
  while (i < s.length) {
    const at = s.indexOf('var(', i);
    if (at < 0) { out += s.slice(i); break; }
    out += s.slice(i, at);
    /* 从 `var(` 开始做括号配对，切出完整实参 */
    let j = at + 4, lvl = 1;
    while (j < s.length && lvl > 0) {
      if (s[j] === '(') lvl++;
      else if (s[j] === ')') lvl--;
      j++;
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
    if (vars[name] !== undefined) {
      out += expandVars(vars[name], vars, depth + 1);
    } else if (fb !== null) {
      out += expandVars(fb, vars, depth + 1);
    }
    /* 变量没定义且无 fallback → 什么都不加（返回空） */
    i = j;
  }
  return out;
}

/** 一条 font-family 的值 → 族名数组（去引号、去空、**不滤通用族**）。
 *
 * ⚠️ 不滤通用族是刻意的。`_font-fallback-chain.mjs` 曾经在数长度之前
 * 把 `serif`/`monospace` 滤掉，于是 `"Martian Mono", ui-monospace, monospace`
 * 被算成「只有 1 个族」→ 报「38 份里 37 份链太短」。
 * 而 5 个原型自己就是这样 —— 按正对照原则，那是判据错，不是产物错。
 *
 * 但 **CSS 关键字不是族名**，必须排掉：
 *   inherit / initial / unset / revert —— 它们表示「继承」或「重置」，
 *   不是字体。留着会让链长虚增 1，正好抵消掉「无退路」那个判据的准确性。
 *
 * 需要「实名族」的调用方请自己再过滤，不要在这里统一滤 —— 因为
 * 「通用族算不算兜底」取决于上下文（等宽链算，正文链不算气质）。
 */
const CSS_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);

export function chainOf(value, vars) {
  const expanded = vars ? expandVars(value, vars) : String(value || '');
  return expanded
    .split(',')
    .map((x) => x.trim().replace(/^["']|["']$/g, '').trim())
    .filter((x) => x && !x.startsWith('var(') && !CSS_KEYWORDS.has(x.toLowerCase()));
}

/** 从整份 HTML/CSS 里抽出所有 font-family 的**值**（已剥注释，未展开）。 */
export function fontDeclarations(src) {
  return [...stripCssComments(src).matchAll(/font-family\s*:\s*([^;}]+)/g)]
    .map((m) => m[1].trim());
}

/** 一步到位：给定 HTML/CSS，返回每条声明的族名数组。
 *  这是最常见的用法，调用方基本不需要别的。 */
export function fontChains(src) {
  const css = stripCssComments(src);
  const vars = cssVariables(css);
  return fontDeclarations(css).map((v) => chainOf(v, vars));
}

/** 这条声明有没有「退路」—— 长度 ≥ 2 就算有（第二个可以就是通用族）。
 *  见 `chainOf` 的注释：这里不判「实名族够不够」。 */
export function hasFallback(chain) {
  return Array.isArray(chain) && chain.length >= 2;
}
