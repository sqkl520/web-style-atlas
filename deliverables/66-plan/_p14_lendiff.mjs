/* 探针 14：p4 与 p12 报出的长度不一致（S09 1632 vs 1652），查清楚。
 * 同一 harness、同一文件顺序，打印 S09 全文长度 + 逐行长度，并与 p4 的字符串对比。 */
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
for (const id of ["S09", "S23", "S01"]) {
  const a = build(id, {});
  const b = build(id, {});
  const c = build(id, undefined);
  console.log(id, "len(1)", a.length, "len(2)", b.length, "len(undefined)", c.length, "identical", a === b && b === c);
}
const s09 = build("S09", {});
console.log("--- S09 全文 ---");
console.log(s09);
console.log("--- 逐行长度 ---");
s09.split("\n").forEach((l, i) => console.log(String(i).padStart(3), String(l.length).padStart(4), l.slice(0, 60)));
console.log("总字符 =", s09.length, " 码点 =", [...s09].length, " 字节 =", Buffer.byteLength(s09, "utf8"));
