/**
 * 探针 a08：对最终 dna-clean.json 的每个值做**独立复算**（不 import clean-dna 的任何函数）。
 *
 * 为什么必须另写一份：用同一套代码"验证"自己等于没验证。这里的口径是
 * 「拿原始文件做最朴素的文本扫描，看这个 px 值到底在不在作者写的声明里」——
 * 不判断点、不判层叠，只回答"这个数在原文件里存在吗"。存在性过了之后，
 * 再单独用 a05/a09 判"它是不是桌面档"。
 *
 * 三条断言：
 *   A. 无编造：lineWidths 里每个 N，都能在某条 border-*、outline、column-rule、
 *      stroke-width 声明（含 HTML 属性）里找到同一个数。
 *   B. 无漏讲：所有"桌面声明"（顶层 + min-width 媒体 + @supports）里的数值，都在 lineWidths 里。
 *   C. h1Size 无 var()：30/30 且每个值都能在对应 CSS 里逐字找到。
 *
 * 重跑：node deliverables/70-exec/probes-a/a08-verify-values.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const P = join(process.cwd(), "prototypes");
const dna = JSON.parse(readFileSync(join(P, "_prompts/dna-clean.json"), "utf8"));
const dirs = readdirSync(P).filter((d) => /^S[0-9]{2}-/.test(d)).sort();
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const round2 = (n) => Math.round(n * 100) / 100;

/* ── 独立口径：把所有「桌面成立」的 :root 变量拼成一张表 ─────────────────
 * 与 clean-dna 的 topVars 实现完全不同：这里用「先切出媒体块区间，再判 1440」的方式，
 * 且判据只看 min/max-width 数字，不做任何字符串归一化。 */
function desktopVars(css) {
  const flat = css.replace(/:root\s*\{[^}]*\}/g, (m) => "\u0000".repeat(m.length)); // 抹掉所有 :root
  const blocks = [];
  for (const m of css.matchAll(/@media([^{]*)\{/g)) {
    let d = 1, i = m.index + m[0].length;
    while (i < css.length && d > 0) { if (css[i] === "{") d++; else if (css[i] === "}") d--; i++; }
    blocks.push({ cond: m[1].trim(), from: m.index, to: i });
  }
  const vars = {};
  for (const m of css.matchAll(/:root\s*\{([\s\S]*?)\}/g)) {
    const inMedia = blocks.find((b) => m.index > b.from && m.index < b.to);
    if (inMedia) {
      const mins = [...inMedia.cond.matchAll(/min-width\s*:\s*(\d+)px/g)].map((x) => +x[1]);
      const maxs = [...inMedia.cond.matchAll(/max-width\s*:\s*(\d+)px/g)].map((x) => +x[1]);
      if (mins.some((v) => v > 1440) || maxs.some((v) => v < 1440)) continue;
      if (!mins.length && !maxs.length) continue;
    }
    for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
  }
  void flat;
  return vars;
}

const expand = (v, vars, n = 0) => {
  if (n > 6 || !v.includes("var(")) return v;
  return expand(v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g,
    (a, k, fb) => (vars[k] !== undefined ? vars[k] : fb || "")), vars, n + 1);
};
const calcIt = (v) => v
  .replace(/calc\(\s*([0-9.]+)px\s*\*\s*([0-9.]+)\s*\)/g, (a, x, y) => round2(+x * +y) + "px")
  .replace(/calc\(\s*([0-9.]+)\s*\*\s*([0-9.]+)px\s*\)/g, (a, x, y) => round2(+x * +y) + "px");

const PROP = /^(?:border|border-width|border-(?:top|right|bottom|left|block|inline)(?:-(?:width|start|end))?|outline|outline-width|column-rule|column-rule-width|stroke-width)$/i;

/* 收集「桌面成立」的线宽数值集合。独立实现：不用花括号栈，用「按 } 切块再回溯选择器」，
 * 与 clean-dna 的 eachRule 完全不同的路径 —— 两条独立路径给出同一答案才算过。 */
function desktopWidths(css, vars) {
  const out = new Map();
  const blocks = [];
  for (const m of css.matchAll(/@media([^{]*)\{/g)) {
    let d = 1, i = m.index + m[0].length;
    while (i < css.length && d > 0) { if (css[i] === "{") d++; else if (css[i] === "}") d--; i++; }
    blocks.push({ cond: m[1].trim(), from: m.index, to: i });
  }
  /* 逐声明扫（不按规则分组）：`prop: value;` 的文本模式足够，且能覆盖单行压缩写法。
   * 媒体归属用「该声明起点落在哪个媒体块区间」判，区间是嵌套时取最内层。 */
  for (const m of css.matchAll(/(?:^|[;{\s])((?:border(?:-[a-z-]+)*|outline(?:-width)?|column-rule(?:-width)?|stroke-width))\s*:\s*([^;}]+)/gi)) {
    const prop = m[1].toLowerCase();
    if (!PROP.test(prop)) continue;
    const at = m.index + m[0].indexOf(m[1]);
    const inside = blocks.filter((b) => at > b.from && at < b.to).pop();
    if (inside) {
      const mins = [...inside.cond.matchAll(/min-width\s*:\s*(\d+)px/g)].map((x) => +x[1]);
      const maxs = [...inside.cond.matchAll(/max-width\s*:\s*(\d+)px/g)].map((x) => +x[1]);
      const ok = (!mins.length || Math.min(...mins) <= 1440) && (!maxs.length || Math.max(...maxs) >= 1440);
      if (!ok) continue;
      if (/prefers-|print|forced-colors/i.test(inside.cond)) continue;
    }
    const value = m[2].trim();
    if (/^(?:none|hidden|0)(?:\s|$)/i.test(value)) continue;
    const r = calcIt(expand(value, vars));
    if (/var\(/.test(r)) continue;
    for (const q of r.matchAll(/([0-9.]+)px/g)) {
      const n = round2(parseFloat(q[1]));
      if (n > 0) out.set(n, (out.get(n) || 0) + 1);
    }
    if (/stroke-width$/.test(prop)) {
      const bare = r.match(/^\s*([0-9.]+)\s*$/);
      if (bare) { const n = round2(parseFloat(bare[1])); if (n > 0) out.set(n, (out.get(n) || 0) + 1); }
    }
  }
  return out;
}

let failA = 0, failB = 0, failC = 0;
console.log("=== A/B 逐案：编造 / 漏讲 ===");
console.log("案    声称 lineWidths                                     编造  漏讲");
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const rec = dna.find((x) => x.id === id);
  if (!rec) { console.log(id + "  !! dna-clean.json 里没有这个案"); failA++; continue; }
  const css = strip(readFileSync(join(P, dir, "style.css"), "utf8"));
  /* 注意：这里**不剥 `<script>`** —— 下面第 ② 段要专门解析 JS 里落到 DOM 的 stroke-width。
   * 注释仍然要剥（教学示例不算）。 */
  const html = readFileSync(join(P, dir, "index.html"), "utf8")
    .replace(/<!--[\s\S]*?-->/g, (m) => " ".repeat(m.length));
  const vars = desktopVars(css);

  /* 真值集合 = 桌面 CSS 声明 ∪ HTML 的 stroke-width 属性 ∪ <script> 里真正落到 DOM 的 stroke-width
   *          − 纹理容器（<pattern>/<clipPath>/<mask>/<marker>/<filter>）里的网格线
   *
   * 两条口径与 clean-dna 对齐（2026-10-30 复核后补，原先这两条是我这边的盲区）：
   *
   *  ① `<script>` 里的 stroke-width **要算**。实测 S03 的 `index.html:231`
   *     `line(major ? 176 : 208, y, 264, y, major ? 1.5 : 1)` → `L225 el.setAttribute("stroke-width", w)`
   *     —— 它真的把 1.5 写进了 DOM，用户看得到。我第一次写这个探针时把 <script> 整段剥掉了，
   *     于是把 clean-dna 抽到的 1.5 误判成"编造"。**那是探针的错，不是数据的错。**
   *
   *  ② `<pattern>` 里的 stroke-width **不算**。实测 S20 的 `index.html:70`
   *     `<pattern id="grid8">…<path stroke-width="0.2"/>` 被 `L71 fill="url(#grid8)"` 当**纹理**填充。
   *     0.2px 是 8px 点阵网格的线，不是版式线宽。我第一次写探针时把它算进真值，
   *     于是把 clean-dna 排除它的行为误判成"漏讲"。**同样是探针的错。**
   */
  const truth = new Set(desktopWidths(css, vars).keys());
  const htmlNoComment = html.replace(/<!--[\s\S]*?-->/g, (m) => " ".repeat(m.length));
  /* 纹理容器区间（与 clean-dna 同判据：这五种容器内的 stroke-width 是填充图案，不是版式线） */
  const textureRanges = [];
  {
    const TEXTURE = /^(pattern|clippath|mask|marker|filter)$/i;
    let tag = null, d = 0, start = 0;
    for (const m of htmlNoComment.matchAll(/<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g)) {
      const t = m[2].toLowerCase();
      if (!tag) { if (!m[1] && TEXTURE.test(t) && !m[4]) { tag = t; d = 1; start = m.index; } }
      else if (t === tag) {
        if (m[1]) d--; else if (!m[4]) d++;
        if (!d) { textureRanges.push([start, m.index + m[0].length]); tag = null; }
      }
    }
  }
  const inTexture = (i) => textureRanges.some(([a, b]) => i >= a && i < b);

  /* HTML 属性（含 <script> 里的 setAttribute，但排除纹理容器） */
  for (const m of htmlNoComment.matchAll(/stroke-width\s*=\s*["']?([0-9.]+)(?:px)?["']?/gi)) {
    const around = htmlNoComment.slice(Math.max(0, m.index - 240), m.index);
    if (/data:image\//i.test(around)) continue;
    if (inTexture(m.index)) continue;
    const n = round2(parseFloat(m[1]));
    if (n > 0) truth.add(n);
  }
  /* <script> 里真正落到 stroke-width 的 JS 值。两种写法，都要**紧贴 stroke-width 上下文**，
   * 不能全文抓三元表达式 —— 实测那样会把 `cx ? 120 : 900` 这种坐标误当线宽（10/30 案假阳性）。
   *
   *   ① `el.setAttribute("stroke-width", w)` 前面给 w 赋值的实参
   *   ② `line(…, major ? 1.5 : 1)` 这种：函数体里有 setAttribute("stroke-width", w)，
   *      调用时末位实参就是线宽。判据是「同一个 <script> 里既有 setAttribute(stroke-width)
   *      又有 `名字(…, cond ? A : B)`」—— 才把 A/B 当线宽。 */
  for (const sm of htmlNoComment.matchAll(/<script\b[\s\S]*?<\/script>/gi)) {
    const s = sm[0];
    const writesStroke = /setAttribute\(\s*["']stroke-width["']/i.test(s);
    if (!writesStroke) continue;
    /* ① 直接写字面量：setAttribute("stroke-width", 1) */
    for (const m of s.matchAll(/setAttribute\(\s*["']stroke-width["']\s*,\s*([0-9.]+)\s*\)/gi)) {
      const n = round2(parseFloat(m[1])); if (n > 0) truth.add(n);
    }
    /* ② 调用点的末位实参是三元：只取**函数调用括号内**且形如 `? A : B` 的，
     *    并要求 A、B 都是**小数或 ≤20 的数**（线宽的量级），排除 120/900 这种坐标。 */
    for (const m of s.matchAll(/\b[a-zA-Z_$][\w$]*\s*\(([^()]*\?[^()]*:[^()]*)\)/g)) {
      const arg = m[1];
      for (const t of arg.matchAll(/\?\s*([0-9.]+)\s*:\s*([0-9.]+)/g)) {
        for (const v of [t[1], t[2]]) {
          const n = round2(parseFloat(v));
          if (n > 0 && n <= 20) truth.add(n);
        }
      }
    }
  }

  /* 声称 */
  const claimed = /无边框线条/.test(rec.lineWidths)
    ? []
    : rec.lineWidths.split("、").map((s) => round2(parseFloat(s)));

  const fabricated = claimed.filter((n) => !truth.has(n));
  const missing = [...truth].filter((n) => n > 0 && !claimed.includes(n)).sort((a, b) => a - b);

  if (fabricated.length) failA++;
  if (missing.length) failB++;
  console.log(
    id.padEnd(4) + " " + rec.lineWidths.padEnd(50) +
    (fabricated.length ? "✗ " + fabricated.join(",") : "✓").padEnd(6) +
    (missing.length ? "✗ " + missing.join(",") : "✓")
  );
}

console.log("\n=== C 逐案：h1Size 可复算 ===");
console.log("案    h1Size                            在 CSS/var 里找得到");
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const rec = dna.find((x) => x.id === id);
  const raw = readFileSync(join(P, dir, "style.css"), "utf8");
  const css = strip(raw);
  const vars = desktopVars(css);
  const want = String(rec.h1Size || "").trim();
  let ok = false;
  if (want && !/var\(/.test(want)) {
    if (css.includes(want)) ok = true;
    else {
      /* 可能来自变量展开：把桌面 :root 的每个值展开后比对 */
      for (const v of Object.values(vars)) if (calcIt(expand(v, vars)).trim() === want) { ok = true; break; }
    }
    if (!ok) {
      /* clamp 里的空格写法差异（clamp(36px,5.3vw,76px) vs clamp(36px, 5.3vw, 76px)） */
      const norm = (s) => s.replace(/\s+/g, "");
      for (const v of Object.values(vars)) if (norm(expand(v, vars)) === norm(want)) { ok = true; break; }
    }
  }
  if (!ok) failC++;
  console.log(id.padEnd(4) + " " + JSON.stringify(want).padEnd(36) + (ok ? "✓" : "✗ 找不到出处"));
}

console.log("\n=== 汇总 ===");
console.log("  A 编造（声称值不在真值里）：" + failA + "/30 案");
console.log("  B 漏讲（桌面真值没进列表）：" + failB + "/30 案");
console.log("  C h1Size 不可复算/含 var()：  " + failC + "/30 案");
const bad = failA + failB + failC;
console.log(bad ? "  → 有 " + bad + " 项不达标 ✗" : "  → 全过 ✓");
process.exit(bad ? 1 : 0);
