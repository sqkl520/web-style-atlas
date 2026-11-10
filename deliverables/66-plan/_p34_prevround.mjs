import { readFileSync } from "node:fs";
const ROOT = "D:/Web/style";
const md = readFileSync(ROOT + "/deliverables/65-exec/EXEC-panel-discoverability.md", "utf8");
// 抓 [mobile] 那一段里所有 Sxx
const i = md.indexOf("[mobile] scrollHeight");
const seg = md.slice(i, i + 600);
const ids = [...seg.matchAll(/S\d{2}=\d+/g)].map((m) => m[0]);
console.log("上一轮自己列出的案数 =", ids.length);
console.log(ids.join(" "));
console.log("但它同一段写的是「移动端 25/30 未过」→ 自相矛盾 =", ids.length === 25 ? "否" : "是（列了 " + ids.length + " 个却说 25）");

// 与我的实测对齐
const mine = JSON.parse(readFileSync(ROOT + "/deliverables/66-plan/_out/panel-measure.json", "utf8"));
const myOver = mine.byVp["390"].filter((r) => r.scrollH > 3800).map((r) => r.id + "=" + r.scrollH);
console.log("\n我的实测 >3800 =", myOver.length, "案");
console.log(myOver.join(" "));
const a = new Set(ids.map((x) => x.split("=")[0]));
const b = new Set(myOver.map((x) => x.split("=")[0]));
console.log("\n两个集合相同?", a.size === b.size && [...a].every((x) => b.has(x)));
const onlyPrev = [...a].filter((x) => !b.has(x)), onlyMine = [...b].filter((x) => !a.has(x));
console.log("只在前一轮:", onlyPrev.join(" ") || "无", " 只在我这轮:", onlyMine.join(" ") || "无");
// 数值逐个比
console.log("\n逐案数值对齐：");
for (const s of ids) {
  const [id, n] = s.split("=");
  const m = mine.byVp["390"].find((r) => r.id === id);
  if (m && +n !== m.scrollH) console.log("  " + id + " 前一轮 " + n + " / 我 " + m.scrollH);
}
console.log("（无输出 = 数值完全一致）");
