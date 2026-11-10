/**
 * 探针 a06：HTML 侧「线宽相关素材」的分布与误报面（只读）。
 *
 * 为什么需要：Bug 2 的修法要扫 index.html。扫之前必须先知道 HTML 里都有什么，
 * 否则会把「注释里举的例子」「data-URI 里的纹理描边」「JS 字符串里的示例」
 * 当成真实线宽写进提示词 —— 那就是从"漏讲"变成"编造"。
 *
 * 逐案统计：
 *   swAttr        真实属性 stroke-width="…"
 *   swInComment   位于 <!-- --> 里的 stroke-width（必须排除）
 *   swInScript    位于 <script> 里的 stroke-width（JS 字符串/模板，不是页面渲染的线）
 *   dataUriSvg    HTML 内联 data:image/svg+xml 里的 stroke-width
 *   cssDataUri    style.css 里 data-URI 内联的 stroke-width
 *   cssComment    style.css 注释里出现的 stroke-width（stripComments 已排除，这里只计数）
 *   inlineStyle   元素 style="…" 里含 width 类的声明
 *   styleBlock    <style> 块里含 width 类的声明
 *
 * 重跑：node deliverables/70-exec/probes-a/a06-html-side-scan.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const P = join(process.cwd(), "prototypes");
const dirs = readdirSync(P).filter((d) => /^S[0-9]{2}-/.test(d)).sort();

/* 把一段文本里「被注释包住」的区间求出来，用于判断某个 match 是否在注释里。 */
const ranges = (s, re) => [...s.matchAll(re)].map((m) => [m.index, m.index + m[0].length]);
const inside = (rs, i) => rs.some(([a, b]) => i >= a && i < b);
const commentRanges = (s) => ranges(s, /<!--[\s\S]*?-->/g);
const scriptRanges = (s) => ranges(s, /<script\b[\s\S]*?<\/script>/gi);
const styleRanges = (s) => ranges(s, /<style\b[\s\S]*?<\/style>/gi);

const rows = [];
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const html = readFileSync(join(P, dir, "index.html"), "utf8");
  const cssRaw = readFileSync(join(P, dir, "style.css"), "utf8");

  const cR = commentRanges(html), sR = scriptRanges(html), stR = styleRanges(html);

  const attr = [], inComment = [], inScript = [], inDataUri = [], inStyleBlock = [];
  for (const m of html.matchAll(/stroke-width\s*=\s*["']?([%0-9.]+)/gi)) {
    const i = m.index;
    const value = m[1];
    /* 判断是否在 data:image/svg+xml 的 URI 里：向前找最近的 "data:image/svg+xml" 或 "url("，
     * 且中间没有未转义的引号收尾 —— 简化判据：所在行的属性值起点在 data:… 之后。 */
    const lineStart = html.lastIndexOf("\n", i) + 1;
    const lineEnd = html.indexOf("\n", i);
    const line = html.slice(lineStart, lineEnd < 0 ? html.length : lineEnd);
    const isDataUri = /data:image\/svg\+xml/i.test(line) || /%3Csvg/i.test(line);
    if (inside(cR, i)) inComment.push(value);
    else if (inside(sR, i)) inScript.push(value);
    else if (inside(stR, i)) inStyleBlock.push(value);
    else if (isDataUri) inDataUri.push(value);
    else attr.push(value);
  }

  /* <style> 块里真正参与线宽的 CSS 声明 */
  const styleDecls = [];
  for (const blk of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    const body = blk[1].replace(/\/\*[\s\S]*?\*\//g, "");
    for (const d of body.matchAll(/(?:^|[;{])\s*((?:border(?:-[a-z-]+)*|outline(?:-width)?|column-rule(?:-width)?|stroke-width))\s*:\s*([^;}]+)/gi))
      styleDecls.push(d[1] + ":" + d[2].trim());
  }
  /* 元素 style="…" 里参与线宽的声明 */
  const inlineDecls = [];
  for (const m of html.matchAll(/\bstyle\s*=\s*["']([^"']*)["']/gi)) {
    for (const d of m[1].matchAll(/((?:border(?:-[a-z-]+)*|outline(?:-width)?|column-rule(?:-width)?|stroke-width))\s*:\s*([^;]+)/gi))
      inlineDecls.push(d[1] + ":" + d[2].trim());
  }
  /* style.css 里 data-URI 的 stroke-width */
  const cssDataUri = [...cssRaw.matchAll(/stroke-width(?:=|%3D)['"]?([%0-9.]+)/gi)].map((m) => m[1]);
  /* style.css 注释里的 stroke-width 计数（证明 stripComments 的必要性） */
  const cssComments = [...cssRaw.matchAll(/\/\*[\s\S]*?\*\//g)].filter((m) => /stroke-width|border.*width/i.test(m[0])).length;

  const any = attr.length || inComment.length || inScript.length || inDataUri.length || styleDecls.length || inlineDecls.length || cssDataUri.length;
  if (!any) continue;
  rows.push({ id, attr, inComment, inScript, inDataUri, inStyleBlock, styleDecls, inlineDecls, cssDataUri, cssComments });
}

console.log("案   attr(真实)     注释内   脚本内  dataURI(HTML)  <style>声明                     内联style  dataURI(CSS)  注释含width");
for (const r of rows) {
  console.log(
    r.id.padEnd(4) + " " +
    (r.attr.join(",") || "—").padEnd(14) + " " +
    (r.inComment.join(",") || "—").padEnd(8) + " " +
    (r.inScript.join(",") || "—").padEnd(6) + " " +
    (r.inDataUri.join(",") || "—").padEnd(13) + " " +
    (r.styleDecls.join(" ").slice(0, 30) || "—").padEnd(32) + " " +
    (r.inlineDecls.join(" ").slice(0, 10) || "—").padEnd(9) + " " +
    (r.cssDataUri.join(",") || "—").padEnd(13) + " " +
    r.cssComments
  );
}

console.log("\n=== 细则 ===");
for (const r of rows) {
  if (!r.inComment.length && !r.inScript.length && !r.inDataUri.length && !r.cssDataUri.length) continue;
  console.log("\n" + r.id);
  if (r.inComment.length) console.log("  注释内 stroke-width（必须排除）：" + r.inComment.join(","));
  if (r.inScript.length) console.log("  <script> 内 stroke-width（不是渲染线）：" + r.inScript.join(","));
  if (r.inDataUri.length) console.log("  HTML data-URI 内：" + r.inDataUri.join(","));
  if (r.cssDataUri.length) console.log("  CSS data-URI 内（纹理/底纹，不是版式线宽）：" + r.cssDataUri.join(","));
}
