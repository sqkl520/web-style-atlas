// 探针 2b：找出 minItems 在 data.js 里的真实落点
import { readFileSync } from "node:fs";
const ROOT = "D:/Web/style";
const src = readFileSync(ROOT + "/prototypes/_selection/data.js", "utf8");
const win = {};
new Function("window", src)(win);
console.log("window keys =", Object.keys(win).join(", "));
const S = win.SCHEMES;
console.log("SCHEMES[0] keys =", Object.keys(S[0]).join(", "));
console.log(JSON.stringify(S[0], null, 1).slice(0, 2500));
