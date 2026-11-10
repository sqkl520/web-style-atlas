/**
 * 探针 a14：复核另一位 Agent（EXEC-B）新增的「第 6 条字号」是否与真值一致。
 *
 * 背景：`prompt-copy.js` 在 2026-10-30 新增了第 6 条硬约束，它从 `dna.h1Size` 里
 * 用 `/(\d+(?:\.\d+)?)px/` 抓**第一个** px 数字来当"最大标题应当多大"。
 * 但 `h1Size` 在 28/30 案里是 `clamp(46px, 6vw, 88px)` 这种形式 ——
 * 第一个数字是 clamp 的**下限**，不是 1440 视口下的实际值。
 *
 * 本探针把每一案的三方并列：
 *   ① h1Size 原文
 *   ② prompt-copy 正则抓到的第一个 px（= 提示词里真实写出的数）
 *   ③ 1440 视口下 clamp 的实际计算值（= 页面上真正显示的字号）
 *
 * 判据：② 与 ③ 相差 > 5% 就算"提示词说小了"。任务书写的是"不许有未注意到的变化"，
 * 这条属于**新增字段带来的新结论**，必须逐案量出来交给 Lead。
 *
 * 重跑：node deliverables/70-exec/probes-a/a14-clause6-h1-accuracy.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = process.cwd();
const SEL = join(ROOT, "prototypes/_selection");
const dna = JSON.parse(readFileSync(join(ROOT, "prototypes/_prompts/dna-clean.json"), "utf8"));

const win = {};
const doc = {
  readyState: "complete", addEventListener() {}, querySelector: () => null,
  querySelectorAll: () => [], getElementById: () => null,
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {} }),
};
const sb = { window: win, document: doc, navigator: { userAgent: "node" } };
vm.createContext(sb); sb.window = win; win.document = doc;
for (const f of ["data.js", "prompts.js", "prompt-copy.js"]) {
  vm.runInContext(readFileSync(join(SEL, f), "utf8"), sb, { filename: f });
}
const build = win.buildStylePrompt;

/* 1440 视口下 clamp 的实际值 */
const at1440 = (v) => {
  const s = String(v || "");
  const m = s.match(/clamp\(\s*([0-9.]+)px\s*,\s*([0-9.]+)vw\s*,\s*([0-9.]+)px\s*\)/);
  if (m) return Math.round(Math.min(Math.max((+m[2] / 100) * 1440, +m[1]), +m[3]) * 100) / 100;
  const p = s.match(/([0-9.]+)px/);
  return p ? +p[1] : null;
};

console.log("案    h1Size 原文                        提示词第 6 条说   1440 实际   偏差");
const bad = [];
for (const d of dna) {
  const t = build(d.id);
  const line = (t.split("\n").find((x) => /^6\. 字号/.test(x)) || "");
  const claimedM = line.match(/最大标题(?:要压到正文的 [\d.]+ 倍左右（约 |取 )(\d+)px/);
  const claimed = claimedM ? +claimedM[1] : null;
  const real = at1440(d.h1Size);
  const dev = claimed && real ? Math.round(((claimed / real) - 1) * 1000) / 10 : null;
  const flag = claimed && real && Math.abs(claimed - real) / real > 0.05;
  if (flag) bad.push({ id: d.id, h1: d.h1Size, claimed, real, dev });
  console.log(
    d.id.padEnd(4) + " " + String(d.h1Size || "").padEnd(34) +
    String(claimed ?? "—").padEnd(18) + String(real ?? "—").padEnd(11) +
    (dev === null ? "—" : (dev > 0 ? "+" : "") + dev + "%") + (flag ? "  ← 说小了 " + Math.abs(dev) + "%" : "")
  );
}

console.log("\n=== 汇总 ===");
console.log("  第 6 条声称值相对 1440 实际值偏差 > 5% 的案：" + bad.length + "/30");
if (bad.length) {
  const maxDev = Math.min(...bad.map((b) => b.dev));
  console.log("  最大偏差：" + bad.find((b) => b.dev === maxDev).id + " " + maxDev + "%");
  console.log("  根因：prompt-copy.js 用 /(\\d+(?:\\.\\d+)?)px/ 抓 h1Size 的**第一个** px，");
  console.log("        而 clamp(a, bvw, c) 的第一个数是**下限 a**，不是 1440 下的实际值。");
  console.log("        h1Size 原文是正确的（clean-dna 已按桌面档解 var），错在渲染端取数方式。");
}
process.exit(bad.length ? 1 : 0);
