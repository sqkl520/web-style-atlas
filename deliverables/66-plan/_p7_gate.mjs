/* 探针 7：事实 6 —— 闸门 8 条 FAIL 的构成，逐案从 data.js 读；并对 S13 的
 * box-shadow 计数做一次独立复核（README 说 17 处 shadow + button-fx 未清）。 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const ROOT = "D:/Web/style";
const src = readFileSync(join(ROOT, "prototypes/_selection/data.js"), "utf8");
const win = {};
new Function("window", src)(win);
const S = win.SCHEMES;
let total = 0;
for (const s of S) {
  const g = s.gate || {};
  const f = g.failIds || [], w = g.warnIds || [];
  total += f.length;
  if (f.length || w.length) console.log(s.id, "FAIL=" + f.length, JSON.stringify(f), "WARN=" + w.length, JSON.stringify(w));
}
console.log("---");
console.log("FAIL 合计 =", total);
console.log("FAIL=0 的案数 =", S.filter((s) => !(s.gate?.failIds?.length)).length);
console.log("WARN>0 的案数 =", S.filter((s) => (s.gate?.warnIds?.length || 0)).length);
console.log("--- S13 style.css 的 box-shadow 逐处 ---");
const css = readFileSync(join(ROOT, "prototypes/S13-blind-debossed-dispatch/style.css"), "utf8");
const lines = css.split(/\r?\n/);
let n = 0;
lines.forEach((l, i) => {
  const m = l.match(/box-shadow\s*:\s*([^;]*)/);
  if (m) { n++; console.log(String(i + 1).padStart(5), m[1].slice(0, 90)); }
});
console.log("box-shadow 声明数 =", n);
console.log("--- 全部 30 案 box-shadow 声明数 ---");
for (const s of S) {
  const p = join(ROOT, "prototypes", s.dir, "style.css");
  let c = "";
  try { c = readFileSync(p, "utf8"); } catch { console.log(s.id, "no style.css"); continue; }
  const cnt = (c.match(/box-shadow\s*:/g) || []).length;
  const none = (c.match(/box-shadow\s*:\s*none/g) || []).length;
  console.log(s.id, "box-shadow:", cnt, " none:", none);
}
