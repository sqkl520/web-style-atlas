/**
 * 探针 a03：CSS 结构健全性 + 媒体查询归属核对（只读）。
 *
 * 为什么要它：a01/a02 用「按花括号配对」的 walker，若某个 style.css 里存在
 * 不成对的 `{` / `}`（注释已剥、data-URI 里可能带花括号），媒体归属就会错，
 * 进而把窄屏覆盖值当成桌面值。本探针直接断言：30 案花括号是否配平、
 * 每个 @media 块的行号范围，以及 `.d1` 这类跨档声明到底落在哪一档。
 *
 * 重跑：node deliverables/70-exec/probes-a/a03-css-structure.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const P = join(process.cwd(), "prototypes");
const dirs = readdirSync(P).filter((d) => /^S[0-9]{2}-/.test(d)).sort();
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");

let bad = 0;
const lineOf = (s, idx) => s.slice(0, idx).split("\n").length;

console.log("=== 1) 花括号配平（剥注释后）===");
for (const dir of dirs) {
  const css = strip(readFileSync(join(P, dir, "style.css"), "utf8"));
  let depth = 0, minDepth = 0, badAt = -1;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") { depth--; if (depth < 0 && badAt < 0) badAt = i; }
  }
  const ok = depth === 0 && badAt < 0;
  if (!ok) { bad++; console.log("  ✗ " + dir + " depth=" + depth + " badAt=" + (badAt >= 0 ? lineOf(css, badAt) : "—")); }
}
console.log(bad ? "  配平失败 " + bad + " 案" : "  30/30 配平 ✓");

console.log("\n=== 2) 每个 @media 的起止行 + 内含的 font-size/stroke/border 覆盖 ===");
for (const dir of dirs) {
  const css = strip(readFileSync(join(P, dir, "style.css"), "utf8"));
  const marks = [];
  const re = /@media([^{]+)\{/g;
  let m;
  while ((m = re.exec(css))) {
    /* 从 { 之后按深度找匹配 } */
    let d = 1, i = re.lastIndex;
    while (i < css.length && d > 0) { if (css[i] === "{") d++; else if (css[i] === "}") d--; i++; }
    const body = css.slice(re.lastIndex, i - 1);
    const inner = [];
    for (const r of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const sel = r[1].trim().replace(/\s+/g, " ").slice(0, 46);
      const decl = (r[2].match(/(?:font-size|stroke-width|border(?:-[a-z]+)*|outline(?:-width)?|column-rule)\s*:\s*[^;]+/g) || [])
        .slice(0, 3).join(" ; ");
      if (decl) inner.push(sel + " { " + decl + " }");
    }
    marks.push({ cond: m[1].trim(), from: lineOf(css, m.index), to: lineOf(css, i), inner });
  }
  const interesting = marks.filter((x) => x.inner.length);
  if (!interesting.length) continue;
  console.log("\n" + dir);
  for (const b of interesting) {
    console.log("  @" + b.cond + "  (L" + b.from + "–L" + b.to + ")");
    for (const s of b.inner) console.log("     " + s.slice(0, 150));
  }
}

console.log("\n=== 3) 是否有 min-width 覆盖落进 1440 视口 ===");
for (const dir of dirs) {
  const css = strip(readFileSync(join(P, dir, "style.css"), "utf8"));
  for (const m of css.matchAll(/@media([^{]+)\{/g)) {
    const c = m[1].trim();
    if (/min-width/.test(c)) {
      const mins = [...c.matchAll(/min-width\s*:\s*(\d+)px/g)].map((x) => +x[1]);
      if (mins.some((v) => v <= 1440)) console.log("  " + dir + "  ::  @" + c + "  (L" + lineOf(css, m.index) + ")");
    }
  }
}
console.log("  （以上若只出现在 max-width 的 and 组合里，1440 视口不成立）");
