import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
const ROOT = "D:/Web/style", SEL = join(ROOT, "prototypes/_selection");

function host(text) {
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
  vm.runInContext(text, ctx, { filename: "x.js" });
  return win;
}
const HEAD = execFileSync("D:\\Git\\cmd\\git.exe", ["show", "HEAD:prototypes/_selection/prompt-copy.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 25 });
const Wh = host(HEAD);
const ids = Wh.STYLE_PROMPTS.schemes.map((s) => s.id);

// 1) 多余空格
let spaceBug = [];
for (const id of ids) {
  const t = Wh.buildStylePrompt(id, {});
  for (const m of t.matchAll(/.{12}真实的 .{12}/g)) spaceBug.push(id + " 「" + m[0] + "」");
}
console.log("=== HEAD 提示词里的「真实的 条目数」多余空格 ===");
console.log("命中 =", spaceBug.length, "/30");
spaceBug.slice(0, 4).forEach((x) => console.log("  " + x));

// 2) 其它双空格 / 空格贴标点
let dbl = 0, beforePunct = 0, samples = [];
for (const id of ids) {
  const t = Wh.buildStylePrompt(id, {});
  for (const line of t.split("\n")) {
    if (/  +/.test(line)) { dbl++; if (samples.length < 3) samples.push(id + " 双空格: " + line.slice(0, 70)); }
    if (/[，。、；：）】」]\s/.test(line)) { beforePunct++; if (samples.length < 6) samples.push(id + " 标点后空格: " + line.slice(0, 70)); }
  }
}
console.log("\n含连续多个空格的行 =", dbl, " 含「标点+空格」的行 =", beforePunct);
samples.forEach((s) => console.log("  " + s));

// 3) 结构约束段的编号是否连续（HEAD）
console.log("\n=== HEAD 结构约束条编号 ===");
const seen = {};
for (const id of ids) {
  const seg = Wh.buildStylePrompt(id, {}).split("结构约束：")[1].split("防退化")[0];
  const nums = [...seg.matchAll(/^(\d)\. /gm)].map((m) => +m[1]);
  const key = nums.join(",");
  seen[key] = (seen[key] || 0) + 1;
}
console.log(JSON.stringify(seen, null, 1));

// 4) 提示词里 "至少" 与 "不凑整" 并存？
console.log("\n=== 同一个提示词里「至少 N 个图片位」与「不凑整」 ===");
const both = ids.filter((id) => {
  const t = Wh.buildStylePrompt(id, {});
  return /至少要 \d+ 个/.test(t) && /不凑整/.test(t);
});
console.log("命中 =", both.length, "/30（这是设计规模与图片位两条约束，不是缺陷，记录备查）");
