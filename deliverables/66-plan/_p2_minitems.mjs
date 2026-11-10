// 探针 2：data.js 的 minItems 全量 + 与 minitems-parsed.json 对比
import { readFileSync } from "node:fs";
const ROOT = "D:/Web/style";
const src = readFileSync(ROOT + "/prototypes/_selection/data.js", "utf8");
const win = {};
new Function("window", src)(win);
const S = win.SCHEMES || (win.STYLE_DATA && win.STYLE_DATA.schemes);
console.log("SCHEMES len =", S.length);
const rows = S.map(s => ({
  id: s.id,
  minItems: s.minItems,
  capMin: s.capacity && s.capacity.minItems,
  degrades: s.capacity && s.capacity.degrades,
  minPics: s.minPics,
  capPics: s.capacity && s.capacity.minPics,
  hard: !!s.hard,
}));
console.log(JSON.stringify(rows, null, 0));
const mi = rows.map(r => r.minItems);
console.log("minItems array =", mi.join(","));
const sorted = [...mi].sort((a, b) => a - b);
const med = (sorted[14] + sorted[15]) / 2;
console.log("median =", med, "max =", Math.max(...mi), "id of max =", rows.find(r => r.minItems === Math.max(...mi)).id);
console.log("sum =", mi.reduce((a, b) => a + b, 0));
const parsed = JSON.parse(readFileSync(ROOT + "/prototypes/_prompts/minitems-parsed.json", "utf8"));
const pmi = parsed.map(p => p.minItems);
console.log("parsed array  =", pmi.join(","));
console.log("arrays equal  =", JSON.stringify(mi) === JSON.stringify(pmi));
console.log("capMin diff from minItems =", rows.filter(r => r.capMin !== r.minItems).map(r => r.id + ":" + r.minItems + "/" + r.capMin).join(" ") || "(none)");
console.log("keys of one scheme =", Object.keys(S[0]).join(","));
