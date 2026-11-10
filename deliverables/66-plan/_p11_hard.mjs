/* 探针 11：hard 字段 —— prompts.js 里 P.hardIds 有 4 个，但 P.schemes[i].hard 是否真的为 true？
 * 这决定 prompt-copy.js 的 riskyTopic（"机制绑在特定题材上"）在多少案上真的会触发。
 * 以及 README 承诺的「14 案按钮旁边直接标 ⚠」是否成立。 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
const SEL = "D:/Web/style/prototypes/_selection";
const win = {}; win.window = win;
const noop = () => {};
const el = () => ({ style: { cssText: "" }, setAttribute: noop, getAttribute: () => null,
  appendChild: noop, insertBefore: noop, addEventListener: noop, querySelector: () => null,
  querySelectorAll: () => [], classList: { add: noop, remove: noop, toggle: noop },
  textContent: "", innerHTML: "", remove: noop, parentNode: { appendChild: noop } });
const doc = { readyState: "loading", addEventListener: noop, removeEventListener: noop,
  createElement: el, getElementById: () => null, querySelector: () => null,
  querySelectorAll: () => [], body: { appendChild: noop, removeChild: noop } };
const ctx = vm.createContext({ window: win, document: doc, console, navigator: {}, setTimeout, clearTimeout });
for (const f of ["data.js", "prompts.js"]) vm.runInContext(readFileSync(join(SEL, f), "utf8"), ctx, { filename: f });
const P = win.STYLE_PROMPTS, S = win.SCHEMES;
console.log("P.hardIds =", JSON.stringify(P.hardIds));
const fromPrompts = P.schemes.filter((s) => s.hard === true).map((s) => s.id);
console.log("P.schemes 里 hard===true 的 =", JSON.stringify(fromPrompts), "(" + fromPrompts.length + ")");
const truthyNotTrue = P.schemes.filter((s) => s.hard && s.hard !== true).map((s) => s.id + "=" + JSON.stringify(s.hard));
console.log("hard 非布尔真值 =", JSON.stringify(truthyNotTrue));
const fromData = S.filter((s) => s.hard).map((s) => s.id);
console.log("data.js 里 hard 真的 =", JSON.stringify(fromData), "(" + fromData.length + ")");
const fromDataNonEmpty = S.filter((s) => typeof s.hard === "string" && s.hard).map((s) => s.id + "=" + JSON.stringify(s.hard));
console.log("data.js hard 是字符串 =", JSON.stringify(fromDataNonEmpty));
const degrad = P.schemes.filter((s) => s.capacity.degrades === "yes").map((s) => s.id);
console.log("degrades=yes =", JSON.stringify(degrad), "(" + degrad.length + ")");
const union = [...new Set([...fromData, ...degrad])].sort();
console.log("data.js hard ∪ degrades =", union.length, JSON.stringify(union));
const unionPrompts = [...new Set([...fromPrompts, ...degrad])].sort();
console.log("P.schemes.hard ∪ degrades =", unionPrompts.length, JSON.stringify(unionPrompts));
console.log("→ prompt-copy.js riskyTopic 实际命中 =", fromPrompts.length, "；ui 上会出现 ⚠ 的案数 =", unionPrompts.length);
console.log("→ README 承诺 14 案 → 差", 14 - unionPrompts.length, "案");
