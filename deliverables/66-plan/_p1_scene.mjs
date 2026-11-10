// 探针 1：sceneIndex 结构 + M0 命中 + 餐厅/咖啡馆查表
import { readFileSync } from "node:fs";
const ROOT = "D:/Web/style";
const src = readFileSync(ROOT + "/prototypes/_selection/prompts.js", "utf8");
const win = {};
new Function("window", src)(win);
const P = win.STYLE_PROMPTS;
const terms = Object.keys(P.sceneIndex);
console.log("sceneIndex keys =", terms.length);
console.log("terms =", terms.join(" | "));
console.log("---");
let m0 = 0;
for (const t of terms) {
  const v = P.sceneIndex[t];
  for (const id of [...(v.direct || []), ...(v.near || [])]) if (/^M0/.test(id)) m0++;
}
console.log("M0 hits inside sceneIndex =", m0);
console.log("P keys top-level =", Object.keys(P).join(", "));
console.log("---");
for (const t of ["餐厅", "咖啡店", "咖啡馆", "烘焙", "民宿", "理发店", "花店", "作品集", "设计师", "摄影师"]) {
  const v = P.sceneIndex[t];
  console.log(t, "->", v ? JSON.stringify(v) : "(no key)");
}
console.log("---");
// 统计 direct 空、near 空
console.log("direct 非空 =", terms.filter(t => (P.sceneIndex[t].direct || []).length).length);
console.log("direct 空 =", terms.filter(t => !(P.sceneIndex[t].direct || []).length).length);
console.log("unsupported =", (P.unsupported || []).length, JSON.stringify(P.unsupported));
