// 路线 C-1：回滚场景 —— HEAD 的 prompts.js（旧数据形状）配当前 prompt-copy.js（新渲染）
import fs from "node:fs";

const R = "D:/Web/style/deliverables/62-verify/r2";
globalThis.window = globalThis;
globalThis.document = {
  readyState: "complete", getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  addEventListener: () => {}, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }), body: { appendChild() {} },
};
(0, eval)(fs.readFileSync("D:/Web/style/prototypes/_selection/data.js", "utf8"));

const cases = [
  { name: "OLD prompts.js + NEW prompt-copy.js（回滚场景）", prompts: R + "/prompts.HEAD.js", copy: "D:/Web/style/prototypes/_selection/prompt-copy.js" },
  { name: "NEW prompts.js + OLD prompt-copy.js（反向回滚）", prompts: "D:/Web/style/prototypes/_selection/prompts.js", copy: R + "/prompt-copy.HEAD.js" },
  { name: "OLD + OLD（基线）", prompts: R + "/prompts.HEAD.js", copy: R + "/prompt-copy.HEAD.js" },
  { name: "NEW + NEW（当前）", prompts: "D:/Web/style/prototypes/_selection/prompts.js", copy: "D:/Web/style/prototypes/_selection/prompt-copy.js" },
];

const out = {};
for (const c of cases) {
  // 每个场景重置
  delete window.STYLE_PROMPTS;
  delete window.buildStylePrompt;
  const errs = [];
  try { (0, eval)(fs.readFileSync(c.prompts, "utf8")); } catch (e) { errs.push("prompts.js: " + e.message); }
  try { (0, eval)(fs.readFileSync(c.copy, "utf8")); } catch (e) { errs.push("prompt-copy.js: " + e.message); }
  const P = window.STYLE_PROMPTS;
  const rows = [];
  if (P && typeof window.buildStylePrompt === "function") {
    for (const s of P.schemes) {
      let txt = "";
      try { txt = window.buildStylePrompt(s.id) || ""; } catch (e) { errs.push(s.id + ": " + e.message); }
      rows.push({
        id: s.id,
        len: txt.length,
        // 占位串 / 抽取记号 / 内部术语 —— 静默出错的信号
        placeholder: /有刻印感的衬线/.test(txt),
        undecided: /未声明/.test(txt),
        extractionMark: /0 \/ 50%|（该案未在 :root 声明色变量/.test(txt),
        hasDoublePunct: /。。/.test(txt),
        fontLine: (txt.split("\n").find((l) => l.startsWith("2. 字体：")) || "").slice(0, 120),
        countLine: (txt.split("\n").find((l) => /^1\. 我实际有/.test(l)) || ""),
        radiusLine: (txt.split("\n").find((l) => l.startsWith("3. 圆角：")) || ""),
        struct2: (txt.split("\n").find((l) => /^2\. /.test(l) && /版式/.test(l)) || "").slice(0, 60),
        txt,
      });
    }
  }
  out[c.name] = { errors: errs, n: rows.length, rows: rows.map(({ txt, ...r }) => r), sampleS07: (rows.find((r) => r.id === "S07") || {}).txt || "" };
  if (c.name.includes("回滚场景")) fs.writeFileSync(R + "/rollback-S07.txt", (rows.find((r) => r.id === "S07") || {}).txt || "", "utf8");
  if (c.name.includes("反向")) fs.writeFileSync(R + "/reverse-S07.txt", (rows.find((r) => r.id === "S07") || {}).txt || "", "utf8");
}

fs.writeFileSync(R + "/c1-rollback.json", JSON.stringify(out, null, 1), "utf8");
for (const [k, v] of Object.entries(out)) {
  const ph = v.rows.filter((r) => r.placeholder).length;
  const un = v.rows.filter((r) => r.undecided).length;
  const dp = v.rows.filter((r) => r.hasDoublePunct).length;
  const em = v.rows.filter((r) => r.extractionMark).length;
  console.log(`\n=== ${k} ===`);
  console.log(`  案数=${v.n} 错误=${v.errors.length ? v.errors.join(" | ") : "无"}`);
  console.log(`  占位串「有刻印感的衬线」=${ph}/30  「未声明」=${un}/30  「。。」=${dp}/30  抽取记号=${em}/30`);
  const s7 = v.rows.find((r) => r.id === "S07");
  if (s7) console.log(`  S07 字体行: ${s7.fontLine}`);
  const s1 = v.rows.find((r) => r.id === "S01");
  if (s1) console.log(`  S01 圆角行: ${s1.radiusLine}`);
}
