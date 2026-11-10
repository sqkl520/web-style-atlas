/* 探针 16：把 HEAD 版 prompt-copy.js 取出来，逐案导出提示词，与当前工作树对比。
 * 目的：任务书里的「我实际有 46 个」和「先把数量凑到 N 个」到底是 HEAD 的实际输出，
 * 还是只存在于注释里的历史引文。同时判定「两个互相打架的指令」在 HEAD 上的真实案数。 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
const ROOT = "D:/Web/style", SEL = join(ROOT, "prototypes/_selection");
const HEAD_SRC = execFileSync("D:\\Git\\cmd\\git.exe", ["show", "HEAD:prototypes/_selection/prompt-copy.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 24 });

function host(fileText) {
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
  vm.runInContext(fileText, ctx, { filename: "prompt-copy.js" });
  return win;
}
const W_head = host(HEAD_SRC);
const W_now = host(readFileSync(join(SEL, "prompt-copy.js"), "utf8"));
const ids = W_head.STYLE_PROMPTS.schemes.map((s) => s.id);

const mine = [];
for (const id of ids) {
  const h = W_head.buildStylePrompt(id, {});
  const n = W_now.buildStylePrompt(id, {});
  const segH = h.split("结构约束：")[1].split("防退化")[0];
  const assertN = /我实际有\s*(\d+)\s*个/.test(segH);
  const realCount = /按你真实.?(条目数|数量)/.test(segH);
  const ifLess = /如果确实不足\s*\d+\s*个/.test(segH);
  mine.push({ id, same: h === n, lenH: h.length, lenN: n.length, assertN, realCount, ifLess, conflict: assertN && (realCount || ifLess) });
}
console.table(mine);
console.log("HEAD 版与工作树不同 =", mine.filter((x) => !x.same).length, "/30");
console.log("HEAD: 「我实际有 N 个」出现 =", mine.filter((x) => x.assertN).length);
console.log("HEAD: 「按你真实的数量」出现 =", mine.filter((x) => x.realCount).length);
console.log("HEAD: 「如果确实不足 N 个」出现 =", mine.filter((x) => x.ifLess).length);
console.log("HEAD: 两条同时命中（真打架）= ", mine.filter((x) => x.conflict).length, "→", mine.filter((x) => x.conflict).map((x) => x.id).join(" "));
const HL = mine.map((x) => x.lenH).sort((a, b) => a - b);
console.log("HEAD 长度 min/median/max =", HL[0], (HL[14] + HL[15]) / 2, HL[29]);
const NL = mine.map((x) => x.lenN).sort((a, b) => a - b);
console.log("NOW  长度 min/median/max =", NL[0], (NL[14] + NL[15]) / 2, NL[29]);
// HEAD 里含 "凑到" 的所有行
console.log("\n--- HEAD 全文里含「凑」的行 ---");
HEAD_SRC.split(/\r?\n/).forEach((l, i) => { if (l.includes("凑")) console.log(String(i + 1).padStart(5), l.trim().slice(0, 100)); });
mkdirSync(join(ROOT, "deliverables/66-plan/_out"), { recursive: true });
writeFileSync(join(ROOT, "deliverables/66-plan/_out/head-vs-now.json"), JSON.stringify(mine, null, 2));
