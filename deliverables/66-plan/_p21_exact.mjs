/* 探针 21：三处数字的精确复核
 *  a) minItems 中位数到底是 9.5 还是 10
 *  b) 390 档 >3800 的案数是 24 还是 25（并给逐案列表，便于对齐别家口径）
 *  c) S13 的 "17 处 shadow" 与 "15 条 box-shadow 声明" 是两个不同的量 —— 拆开
 *  d) `taste-skill-ignore` 注释是否被任何规则引擎读取（它出现在 S13 的 15 条声明后面）
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const ROOT = "D:/Web/style";
const src = readFileSync(join(ROOT, "prototypes/_selection/prompts.js"), "utf8");
const win = {}; new Function("window", src)(win);
const S = win.STYLE_PROMPTS.schemes;

// a)
const mi = S.map((s) => s.minItems).sort((a, b) => a - b);
console.log("minItems 排序 =", mi.join(","));
console.log("n =", mi.length, " 中位 =", (mi[14] + mi[15]) / 2, " (第15/16 位 =", mi[14], mi[15] + ")");
console.log("mean =", (mi.reduce((a, b) => a + b, 0) / mi.length).toFixed(2), " max =", mi[29], "=", S.find((s) => s.minItems === 46).id);

// c) S13
const rep = JSON.parse(readFileSync(join(ROOT, "prototypes/S13-blind-debossed-dispatch/.inspect/report.json"), "utf8"));
console.log("\n--- S13 ---");
for (const v of rep.viewports) console.log(`  ${v.width}px: shadowStatic=${v.metrics.surfaces.shadowStatic} shadowOverlay=${v.metrics.surfaces.shadowOverlay} buttons.withShadow=${v.metrics.buttons.withShadow}/${v.metrics.buttons.count}`);
const css = readFileSync(join(ROOT, "prototypes/S13-blind-debossed-dispatch/style.css"), "utf8");
const decl = [...css.matchAll(/box-shadow\s*:\s*([^;]*)/g)].map((m) => m[1].trim());
console.log("  box-shadow 声明数 =", decl.length, " 其中 none =", decl.filter((x) => x === "none").length);
const withIgnore = [...css.matchAll(/box-shadow\s*:\s*[^;]*\/\*\s*taste-skill-ignore:([^*]*)\*\//g)].length;
console.log("  带 taste-skill-ignore 注释的声明 =", withIgnore, "/", decl.length);
// 变量定义
const vars = [...css.matchAll(/--press-[a-z0-9-]+\s*:\s*([^;]+);/g)].map((m) => m[1].trim());
console.log("  --press-* 变量数 =", vars.length);
console.log("  含 inset 的变量 =", vars.filter((v) => /inset/.test(v)).length, "/", vars.length);
console.log("  前 3 个："); vars.slice(0, 3).forEach((v) => console.log("    " + v.slice(0, 110)));

// d) taste-skill-ignore 是否被读取
console.log("\n--- taste-skill-ignore 的支持情况 ---");
const tools = join(ROOT, "tools");
let hits = [];
function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) { if (!/node_modules|\.git/.test(e.name)) walk(p); }
    else if (/\.(mjs|js|cjs)$/.test(e.name)) {
      const t = readFileSync(p, "utf8");
      if (t.includes("taste-skill-ignore")) hits.push(p.replace(ROOT + "\\", ""));
    }
  }
}
walk(tools);
console.log("  tools/ 下引用 taste-skill-ignore 的脚本 =", hits.length ? hits.join(", ") : "（0 个）");
const buildScripts = readdirSync(join(ROOT, "prototypes/_build")).filter((f) => f.endsWith(".mjs"));
const bhits = buildScripts.filter((f) => readFileSync(join(ROOT, "prototypes/_build", f), "utf8").includes("taste-skill-ignore"));
console.log("  prototypes/_build/ 下引用它的脚本 =", bhits.length ? bhits.join(", ") : "（0 个）");

// b) 390 >3800 逐案
const pm = JSON.parse(readFileSync(join(ROOT, "deliverables/66-plan/_out/panel-measure.json"), "utf8"));
const rows = pm.byVp["390"];
const over = rows.filter((r) => r.scrollH > 3800);
console.log("\n--- 390 档 >3800 ---");
console.log("  ", over.length + "/30  →", over.map((r) => r.id + ":" + r.scrollH).join(" "));
console.log("  ≤3800 的：", rows.filter((r) => r.scrollH <= 3800).map((r) => r.id + ":" + r.scrollH).join(" "));
