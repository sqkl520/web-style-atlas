/* 探针 8：结构约束段逐案提取，检查「我实际有 N 个」与「按你真实的数量」是否同时出现 */
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

const ASSERT = /我实际有\s*(\d+)\s*个/;
const REALS = /按你真实的?\s*(条目数|数量)/;
const rows = [];
for (const s of P.schemes) {
  const t = build(s.id, {});
  const seg = t.split("结构约束：")[1].split("防退化")[0];
  const a = ASSERT.exec(seg);
  rows.push({
    id: s.id, min: s.minItems, dg: s.capacity.degrades,
    assertN: a ? +a[1] : null,
    hasReal: REALS.test(seg),
    hasIfLess: /如果确实不足\s*\d+\s*个/.test(seg),
    hasAutoFlow: /自动流排版/.test(seg),
    hasNoPad: /不留空位|不留空槽/.test(seg),
    hasNoFabricate: /不要为了凑数编造内容|不要编造条目/.test(seg),
  });
}
console.table(rows);
console.log("assertN present =", rows.filter((r) => r.assertN !== null).length, "/30");
console.log("hasReal present =", rows.filter((r) => r.hasReal).length, "/30");
console.log("both =", rows.filter((r) => r.assertN !== null && r.hasReal).length, "/30");
console.log("both AND N>=20 =", rows.filter((r) => r.assertN !== null && r.hasReal && r.assertN >= 20).map((r) => r.id + ":" + r.assertN).join(" "));
console.log("both AND dg=no =", rows.filter((r) => r.assertN !== null && r.hasReal && r.dg === "no").length);
console.log("both AND dg=yes =", rows.filter((r) => r.assertN !== null && r.hasReal && r.dg === "yes").length);
// 结构约束段原文（3 个代表）
for (const id of ["S07", "S29", "S22"]) {
  const t = build(id, {});
  console.log("\n=== " + id + " 结构约束 ===");
  console.log(t.split("结构约束：")[1].split("防退化")[0].trim());
}
