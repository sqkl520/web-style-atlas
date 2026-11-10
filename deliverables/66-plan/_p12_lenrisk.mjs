/* 探针 12：如果改「我实际有 N 个」这句，check-docs 的 nums/prompt-len 会怎样？
 * 不改仓库，只在内存里做字符串替换后重算 min/median/max，与 README 的 1632–1920 / 中位 1822 比。
 * 同时给出三种候选改法的净增量。
 */
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

function stats(lens) {
  const s = [...lens].sort((a, b) => a - b);
  return { min: s[0], max: s[s.length - 1], median: (s[14] + s[15]) / 2 };
}
const base = P.schemes.map((s) => build(s.id, {}).length);
console.log("现状", JSON.stringify(stats(base)));
console.log("文案基线 min=" + Math.min(...base) + " (" + P.schemes[base.indexOf(Math.min(...base))].id + ") max=" + Math.max(...base) + " (" + P.schemes[base.indexOf(Math.max(...base))].id + ")");

const CANDIDATES = {
  "B: 改成设计规模措辞（长一点）": (t) =>
    t.replace(/(\d+) 个条目，就排 \1 个：/g, "个条目，设计时按 $1 个排的（这是版式的设计规模，不是你的内容量）："),
  "C: 改成纯设计规模 + 不重复数字": (t) =>
    t.replace(/我实际有 (\d+) 个条目，就排 \1 个：/g, "这个版式设计时排了 $1 个条目（是它的设计规模，不是你的内容数量）："),
  "D: 只删「我实际有」四字（最小改动）": (t) => t.replace(/我实际有 /g, ""),
  "E: 只把「我实际有」换成「这个版式」": (t) => t.replace(/我实际有 /g, "这个版式有 "),
};
for (const [name, fn] of Object.entries(CANDIDATES)) {
  const lens = P.schemes.map((s) => fn(build(s.id, {})).length);
  const st = stats(lens);
  const dmin = (st.min - Math.min(...base)), dmax = (st.max - Math.max(...base)), dmed = st.median - stats(base).median;
  console.log(`\n${name}`);
  console.log(`  min ${st.min} (${(dmin / Math.min(...base) * 100).toFixed(1)}%)  median ${st.median} (${(dmed / stats(base).median * 100).toFixed(1)}%)  max ${st.max} (${(dmax / Math.max(...base) * 100).toFixed(1)}%)`);
  console.log(`  与 README「1632–1920，中位 1822」对比：min 差 ${st.min - 1632}，max 差 ${st.max - 1920}，中位差 ${st.median - 1822}`);
  console.log(`  check-docs 判定：${st.min === 1632 && st.max === 1920 && st.median === 1822 ? "PASS" : (Math.abs(st.min - 1632) / st.min <= 0.03 && Math.abs(st.max - 1920) / st.max <= 0.03 && Math.abs(st.median - 1822) / st.median <= 0.03 ? "WARN(漂移≤3%)" : "FAIL")}`);
}
