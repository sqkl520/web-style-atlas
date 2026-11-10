// 探针 3：prompts.js 的 schemes / capacity / dna 形状
import { readFileSync } from "node:fs";
const ROOT = "D:/Web/style";
const src = readFileSync(ROOT + "/prototypes/_selection/prompts.js", "utf8");
const win = {};
new Function("window", src)(win);
const P = win.STYLE_PROMPTS;
const ids = Object.keys(P.schemes);
console.log("schemes =", ids.length, ids.join(","));
const s0 = P.schemes[ids[0]];
console.log("keys =", Object.keys(s0).join(","));
console.log(JSON.stringify(s0, null, 1).slice(0, 1800));
console.log("--- capacity present on any? ---");
const withCap = ids.filter(id => P.schemes[id].capacity);
console.log("with capacity =", withCap.length, withCap.join(","));
const withMin = ids.filter(id => typeof P.schemes[id].minItems === "number");
console.log("with minItems =", withMin.length);
const withPics = ids.filter(id => typeof P.schemes[id].minPics === "number");
console.log("with minPics =", withPics.length);
console.log("hardIds =", JSON.stringify(P.hardIds));
console.log("--- per-scheme capacity.degrades ---");
for (const id of ids) {
  const s = P.schemes[id];
  console.log(id, "minItems=" + s.minItems, "minPics=" + s.minPics, "cap=" + JSON.stringify(s.capacity || null), "hard=" + !!s.hard);
}
