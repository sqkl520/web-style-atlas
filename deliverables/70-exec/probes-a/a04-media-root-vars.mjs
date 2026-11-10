/**
 * 探针 a04：`@media` 内 `:root` 覆盖清单 —— 证明「只取顶层 :root」的影响面（只读）。
 *
 * 背景：clean-dna.mjs 建 vars 字典时遍历**所有** `:root` 块、不区分是否在 @media 内，
 * 后出现的覆盖前面的（审计报告 69-audit/PATCH-linewidth.md §4 称"媒体查询泄漏"）。
 * 修 Bug 2 必须让 vars 只认顶层，否则 S27 的 --mis 会拿窄屏的 1.2。
 *
 * 但 vars 同时被 palette / radius / shadow / fonts 共用。所以要证明：
 *   ① 有多少案在 @media 里覆盖 :root；
 *   ② 这些被覆盖的变量里，有没有含 hex 色值 / 字体栈 / 圆角 / 阴影 —— 即是否可能影响其它字段。
 *
 * 重跑：node deliverables/70-exec/probes-a/a04-media-root-vars.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const P = join(process.cwd(), "prototypes");
const dirs = readdirSync(P).filter((d) => /^S[0-9]{2}-/.test(d)).sort();
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/* 收集所有 :root 块，带媒体上下文。用简单的深度扫描（30 案花括号已由 a03 证明配平）。 */
function rootBlocks(css) {
  const out = [];
  const re = /@media([^{]+)\{/g;
  let m;
  const mediaRanges = [];
  while ((m = re.exec(css))) {
    let d = 1, i = re.lastIndex;
    while (i < css.length && d > 0) { if (css[i] === "{") d++; else if (css[i] === "}") d--; i++; }
    mediaRanges.push({ cond: m[1].trim(), from: m.index, to: i });
  }
  const inMedia = (idx) => mediaRanges.find((r) => idx > r.from && idx < r.to) || null;

  for (const r of css.matchAll(/:root\s*\{([\s\S]*?)\}/g)) {
    const ctx = inMedia(r.index);
    const vars = {};
    for (const d of r[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
    out.push({ media: ctx ? ctx.cond : null, vars });
  }
  return out;
}

let withMedia = 0;
const pxCovered = new Set();
const nonPx = [];
const allMediaVarNames = new Set();

console.log("=== ① 在 @media 里覆盖 :root 的案 ===");
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const css = strip(readFileSync(join(P, dir, "style.css"), "utf8"));
  const blocks = rootBlocks(css);
  const media = blocks.filter((b) => b.media);
  if (!media.length) continue;
  withMedia++;
  console.log("\n" + id + "  (" + media.length + " 个媒体内 :root)");
  for (const b of media) {
    for (const [k, v] of Object.entries(b.vars)) {
      allMediaVarNames.add(k);
      const isPx = /(^|[\s(,])[0-9.]+px/.test(v) || /^-?[0-9.]+px$/.test(v);
      const hasHex = /#[0-9A-Fa-f]{3,8}\b/.test(v);
      const hasFont = /var\(--f-|"|,/.test(v) && !isPx;
      const hasRadius = /border-radius|50%|^\s*[0-9.]+px\s*$/i.test(k);
      const tag = hasHex ? "HEX!" : isPx ? "px" : "OTHER";
      if (tag === "px") pxCovered.add(id);
      else nonPx.push({ id, k, v, tag, hasFont, hasRadius });
      console.log("   [" + tag + "] " + k + " = " + v + "   @" + b.media);
    }
  }
}

console.log("\n=== ② 汇总 ===");
console.log("  有媒体内 :root 的案：" + withMedia + "/30");
console.log("  其中被覆盖变量含 px 长度的案：" + [...pxCovered].sort().join(",") || "（无）");
console.log("  被媒体覆盖过的变量名全表（" + allMediaVarNames.size + " 个）：" + [...allMediaVarNames].sort().join(" "));
console.log("  非 px 的媒体覆盖条目：" + (nonPx.length ? "" : "无 —— 全部是 px 长度，无 hex 色值、无字体栈"));
for (const x of nonPx) console.log("    " + x.id + " " + x.k + " = " + x.v + " [" + x.tag + "]");

console.log("\n=== ③ 关键断言：哪些变量会被 lineWidthVerdict / radiusVerdict / h1Size / palette 用到 ===");
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const css = strip(readFileSync(join(P, dir, "style.css"), "utf8"));
  const blocks = rootBlocks(css);
  const top = {};
  for (const b of blocks) if (!b.media) Object.assign(top, b.vars);
  const mediaVars = {};
  for (const b of blocks) if (b.media) Object.assign(mediaVars, b.vars);
  const changed = Object.keys(mediaVars).filter((k) => top[k] !== undefined && top[k] !== mediaVars[k]);
  if (!changed.length) continue;
  /* 这些变量是否出现在任何线宽属性里 */
  const usedInWidth = changed.filter((k) =>
    new RegExp("(?:border[a-z-]*|outline(?:-width)?|stroke-width|column-rule)\\s*:\\s*[^;}]*var\\(\\s*" + k + "\\b").test(css));
  const usedInFont = changed.filter((k) => new RegExp("font-family\\s*:\\s*[^;}]*var\\(\\s*" + k + "\\b").test(css));
  const usedInRadius = changed.filter((k) => new RegExp("border-radius\\s*:\\s*[^;}]*var\\(\\s*" + k + "\\b").test(css));
  const usedInShadow = changed.filter((k) => new RegExp("box-shadow\\s*:\\s*[^;}]*var\\(\\s*" + k + "\\b").test(css));
  console.log("  " + id + "  被媒体改写的变量=" + changed.join(",") +
    "  用于线宽:" + (usedInWidth.join(",") || "—") +
    "  用于字体:" + (usedInFont.join(",") || "—") +
    "  用于圆角:" + (usedInRadius.join(",") || "—") +
    "  用于阴影:" + (usedInShadow.join(",") || "—"));
}
