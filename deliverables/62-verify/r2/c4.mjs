// 路线 C-4：S18 minItems=20 vs DOM 实际行数；S30 degrades 判定
import { readFileSync } from "node:fs";
const P = "D:/Web/style/prototypes/";

function count(html, re) { return (html.match(re) || []).length; }

for (const [id, dir] of [["S18", "S18-phosphor-service-deck"], ["S30", "S30-skate-sticker-split"], ["S19", "S19-drawer-specimen-cabinet"]]) {
  let html = "";
  try { html = readFileSync(P + dir + "/index.html", "utf8"); } catch (e) { console.log(id, "read err", e.message); continue; }
  const css = readFileSync(P + dir + "/style.css", "utf8");
  console.log(`\n=== ${id} (${dir}) ===`);
  console.log("  html 长度:", html.length);
  // 常见重复单元
  for (const [label, re] of [
    ["<li", /<li\b/g], ["<tr", /<tr\b/g], ["<article", /<article\b/g],
    ["class=row", /class="[^"]*\brow\b[^"]*"/g],
    ["class=entry", /class="[^"]*\bentry\b[^"]*"/g],
    ["class=log", /class="[^"]*\blog\b[^"]*"/g],
    ["class=line", /class="[^"]*\bline\b[^"]*"/g],
  ]) {
    const n = count(html, re);
    if (n) console.log(`  ${label}: ${n}`);
  }
  // 看是否有写死编号/绝对定位
  console.log("  position:absolute 次数:", count(css, /position\s*:\s*absolute/g));
  console.log("  grid-template-columns 写死 px 次数:", count(css, /grid-template-columns\s*:[^;]*\d+px/g));
  console.log("  nth-child 次数:", count(css, /:nth-child/g));
}
