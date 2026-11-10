// 探针 4：逐案导出提示词，检查事实 1 的「打架」
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
for (const f of ["data.js", "prompts.js", "prompt-copy.js"]) vm.runInContext(readFileSync(join(SEL, f), "utf8"), ctx, { filename: f });
const build = win.buildStylePrompt;
const P = win.STYLE_PROMPTS;

let both = 0, one = 0, none = 0;
const rows = [];
for (const s of P.schemes) {
  const t = build(s.id, {});
  const hasActualN = /我实际有\s*\d+\s*个/.test(t);
  const hasRealCount = /按你真实的?\s*条目数|按你真实的数量/.test(t);
  const hasIfLess = /如果确实不足\s*\d+\s*个/.test(t);
  const hasCou = /凑到|凑够|凑整/.test(t);
  if (hasActualN && hasRealCount) both++; else if (hasActualN || hasRealCount) one++; else none++;
  rows.push({ id: s.id, minItems: s.minItems, degrades: s.capacity.degrades,
    hasActualN, hasRealCount, hasIfLess, hasCou, len: t.length });
}
console.table(rows);
console.log("both(实际有N + 按你真实数量) =", both, " one =", one, " none =", none);
console.log("degrades=yes count =", rows.filter(r => r.degrades === "yes").length);
console.log("hasIfLess count =", rows.filter(r => r.hasIfLess).length);
console.log("hasCou count =", rows.filter(r => r.hasCou).length);
console.log("=== S07 prompt ===");
console.log(build("S07", {}));
