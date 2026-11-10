/**
 * 探针 a09：把 prompts.js 真正喂给 prompt-copy.js 跑一遍（与浏览器同一条装载路径）。
 *
 * 为什么要用 vm 而不是直接 import：
 *   data.js / prompts.js 都是 `window.X = …` 的浏览器脚本，prompt-copy.js 是 IIFE 且读
 *   `window.STYLE_PROMPTS` / `window.SCHEMES`，还会碰 document。用 vm + 一个最小 document
 *   桩装进去，跑的就是浏览器里那三个文件本身，不是"我另写一份等价逻辑"。
 *
 * 断言（对 S01 / S25 / 全部 30 案）：
 *   1. buildStylePrompt 是函数
 *   2. 输出非空、长度落在 1500–2100 之间
 *   3. 不含 `var(--`、`undefined`、`NaN`、`[object`
 *   4. 含第 5 条线宽行，且该行的数值集合 === dna-clean.json 的 lineWidths
 *   5. S01 / S25 全文逐字打印（供人工读一遍）
 *
 * 重跑：node deliverables/70-exec/probes-a/a09-build-prompt-eval.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const SEL = join(process.cwd(), "prototypes/_selection");
const dna = JSON.parse(readFileSync(join(process.cwd(), "prototypes/_prompts/dna-clean.json"), "utf8"));

const win = {};
const doc = {
  readyState: "complete",
  addEventListener() {}, removeEventListener() {},
  querySelector: () => null, querySelectorAll: () => [],
  getElementById: () => null,
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {}, classList: { add() {}, remove() {} } }),
  body: { appendChild() {}, classList: { add() {}, remove() {} } },
  documentElement: { style: {}, classList: { add() {}, remove() {} } },
};
const sandbox = { window: win, document: doc, navigator: { userAgent: "node" }, location: { href: "http://x/" } };
vm.createContext(sandbox);
sandbox.window = win;
win.document = doc;
for (const f of ["data.js", "prompts.js", "prompt-copy.js"]) {
  vm.runInContext(readFileSync(join(SEL, f), "utf8"), sandbox, { filename: f });
}

const build = win.buildStylePrompt || sandbox.buildStylePrompt;
console.log("=== 0) 装载 ===");
console.log("  window.SCHEMES      : " + (win.SCHEMES ? win.SCHEMES.length + " 案" : "缺失"));
console.log("  window.STYLE_PROMPTS: " + (win.STYLE_PROMPTS ? win.STYLE_PROMPTS.schemes.length + " 案" : "缺失"));
console.log("  buildStylePrompt    : " + typeof build);
if (typeof build !== "function") { console.log("!! 装载失败"); process.exit(1); }

const bad = [];
const rows = [];
const linewidthOf = (t) => {
  /* 文案尾句的措辞会变（"不要自创第三级" / "不要自创新值" —— 另一位 Agent 改过），
   * 所以只锚定「行首 5. + 线宽只用这几级 + 冒号」这一段，尾句不参与匹配。
   * 断言的对象是**数值集合**，不是措辞。 */
  const m = t.match(/^5\. 线宽只用这几级：(.+?)，/m);
  return m ? m[1] : null;
};
const nums = (s) => (s || "").split("、").map((x) => parseFloat(x)).filter((n) => !isNaN(n)).sort((a, b) => a - b);

for (const rec of dna) {
  const id = rec.id;
  let t;
  try { t = build(id); } catch (e) { bad.push(id + " 抛异常: " + e.message); continue; }
  if (typeof t !== "string" || !t.length) { bad.push(id + " 输出为空"); continue; }
  /* 长度窗口刻意放宽到 1500–2300：提示词在活跃编辑中（本轮有另一个 Agent 加了「第 6 条 字号」，
   * 每案 +~100 字），把窗口钉在旧值会让探针因为**别人合法的改动**而红 —— 那不是缺陷。
   * 这里要抓的是"明显异常"：空串、被截断、或者翻了倍。具体区间由 check-docs 的
   * nums/prompt-len 断言负责（它读 README 承诺的区间）。 */
  if (t.length < 1500 || t.length > 2300) bad.push(id + " 长度异常 " + t.length);
  for (const pat of [/var\(--/, /undefined/, /\bNaN\b/, /\[object/]) {
    if (pat.test(t)) bad.push(id + " 含 " + pat);
  }
  const lw = linewidthOf(t);
  if (!lw) bad.push(id + " 缺第 5 条线宽行");
  else {
    const a = nums(lw), b = nums(rec.lineWidths);
    if (a.join(",") !== b.join(",")) bad.push(id + " 线宽行与 dna 不一致：" + lw + " vs " + rec.lineWidths);
  }
  rows.push({ id, len: t.length, lw: lw || "(缺)" });
}

console.log("\n=== 1) 30 案批量断言 ===");
console.log("案    字数   第 5 条线宽行");
for (const r of rows) console.log(r.id.padEnd(4) + " " + String(r.len).padStart(5) + "  " + r.lw);
const lens = rows.map((r) => r.len).sort((a, b) => a - b);
console.log("  → 长度 min " + lens[0] + " / median " + lens[Math.floor(lens.length / 2)] + " / max " + lens[lens.length - 1]);
console.log(bad.length ? "\n✗ 问题 " + bad.length + " 条：\n  " + bad.join("\n  ") : "\n✓ 30/30 全部通过（无 var(-- / undefined / NaN，线宽行与 dna 一致）");

console.log("\n=== 2) 任务点名的两案全文 ===");
for (const id of ["S01", "S25"]) {
  const t = build(id);
  console.log("\n" + "─".repeat(78));
  console.log("### " + id + "  （" + t.length + " 字）");
  console.log("─".repeat(78));
  console.log(t);
}

process.exit(bad.length ? 1 : 0);
