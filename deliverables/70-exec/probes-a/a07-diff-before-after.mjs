/**
 * 探针 a07：改前 / 改后逐案 diff（dna-clean.json + prompts.js 正文）。
 *
 * 用法：node deliverables/70-exec/probes-a/a07-diff-before-after.mjs
 *   · 基线 = deliverables/70-exec/backup-a/ 里的备份（改前快照）
 *   · 现状 = prototypes/_prompts/dna-clean.json + prototypes/_selection/prompts.js
 * 输出：每个案的 h1Size / lineWidths 新旧对照，以及提示词正文的逐字差异统计。
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = process.cwd();
const BK = join(ROOT, "deliverables/70-exec/backup-a");

const oldDna = JSON.parse(readFileSync(join(BK, "dna-clean.json"), "utf8"));
const newDna = JSON.parse(readFileSync(join(ROOT, "prototypes/_prompts/dna-clean.json"), "utf8"));

const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
const O = byId(oldDna), N = byId(newDna);

console.log("=== 1) h1Size 新旧对照 ===");
console.log("案    旧值                              新值                              变化");
let h1changed = 0;
for (const id of Object.keys(O).sort()) {
  const a = O[id].h1Size, b = N[id].h1Size;
  if (a !== b) h1changed++;
  console.log(id + "  " + JSON.stringify(a).padEnd(34) + JSON.stringify(b).padEnd(34) + (a === b ? "=" : "CHANGED"));
}
console.log("  → 变化 " + h1changed + "/30");

console.log("\n=== 2) lineWidths 新旧对照（逐案）===");
console.log("案    旧值                                                 新值                                                 变化");
const lwChanged = [];
for (const id of Object.keys(O).sort()) {
  const a = O[id].lineWidths, b = N[id].lineWidths;
  const same = a === b;
  if (!same) lwChanged.push(id);
  console.log(id + "  " + String(a).padEnd(52) + String(b).padEnd(52) + (same ? "=" : "CHANGED"));
}
console.log("  → 变化 " + lwChanged.length + "/30：" + lwChanged.join(","));

console.log("\n=== 3) 其它字段是否被动过（palette / fonts / radius / shadow / mechanism）===");
let other = 0;
for (const id of Object.keys(O).sort()) {
  const diffs = [];
  for (const k of ["palette", "radius", "radiusBare", "shadow", "mechanism", "primary"]) {
    const a = JSON.stringify(O[id][k]), b = JSON.stringify(N[id][k]);
    if (a !== b) diffs.push(k + ": " + a + " → " + b);
  }
  for (const k of ["display", "body", "mono"]) {
    const a = O[id].fonts[k], b = N[id].fonts[k];
    if (a !== b) diffs.push("fonts." + k + ": " + a + " → " + b);
  }
  if (diffs.length) { other++; console.log("  " + id + "  " + diffs.join(" | ")); }
}
console.log(other ? "  → 有 " + other + " 案的其它字段变了（需逐条确认是否预期）" : "  → 其它字段 0 变化 ✓");

/* ── 4) 提示词正文 diff ─────────────────────────────────────────────── */
const SEL = join(ROOT, "prototypes", "_selection");
function promptsText(promptsPath) {
  const win = {};
  const sandbox = { window: win, document: {
    readyState: "complete", addEventListener() {}, querySelector: () => null,
    querySelectorAll: () => [], getElementById: () => null,
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {} }),
  } };
  vm.createContext(sandbox);
  sandbox.document = sandbox.document;
  for (const f of ["data.js", "prompts.js", "prompt-copy.js"]) {
    const p = f === "prompts.js" ? promptsPath : join(SEL, f);
    vm.runInContext(readFileSync(p, "utf8"), sandbox, { filename: f });
  }
  return win.buildStylePrompt;
}

const buildOld = promptsText(join(BK, "prompts.js"));
const buildNew = promptsText(join(SEL, "prompts.js"));
if (typeof buildOld !== "function" || typeof buildNew !== "function") {
  console.log("\n!!! buildStylePrompt 装载失败，跳过正文 diff");
  process.exit(1);
}

const ids = Object.keys(O).sort();
console.log("\n=== 4) 提示词正文 diff（逐案）===");
console.log("案    旧字数  新字数  增幅   变化字段");
const rows = [];
for (const id of ids) {
  const a = buildOld(id), b = buildNew(id);
  const fields = [];
  if (O[id].h1Size !== N[id].h1Size) fields.push("h1Size");
  if (O[id].lineWidths !== N[id].lineWidths) fields.push("lineWidths");
  rows.push({ id, a: a.length, b: b.length, d: b.length - a.length, fields: fields.join("+") || "—" });
  console.log(id + "  " + String(a.length).padStart(6) + "  " + String(b.length).padStart(6) + "  " +
    ((b.length - a.length >= 0 ? "+" : "") + (b.length - a.length)).padStart(5) + "   " + (fields.join("+") || "—"));
}
const tot = rows.reduce((s, r) => s + r.d, 0);
console.log("  → 合计 " + (tot >= 0 ? "+" : "") + tot + " 字");

/* 正文里出现 var(-- 或 undefined 的案（必须在改后为 0） */
const badVar = ids.filter((id) => /var\(--/.test(buildNew(id)));
const badUndef = ids.filter((id) => /undefined|NaN/.test(buildNew(id)));
const badVarOld = ids.filter((id) => /var\(--/.test(buildOld(id)));
console.log("\n=== 5) 文本卫生 ===");
console.log("  改前含 var(--：" + (badVarOld.join(",") || "无"));
console.log("  改后含 var(--：" + (badVar.join(",") || "无") + (badVar.length ? "  ✗" : "  ✓"));
console.log("  改后含 undefined/NaN：" + (badUndef.join(",") || "无") + (badUndef.length ? "  ✗" : "  ✓"));

/* 逐字 diff 一行样本（只打前 3 个变化案的对照行） */
console.log("\n=== 6) 变化案的关键行对照 ===");
const line = (t, re) => (t.split("\n").find((l) => re.test(l)) || "(无该行)").trim();
for (const id of ["S01", "S09", "S25", "S27", "S20"]) {
  console.log("\n" + id);
  console.log("  改前 5. " + line(buildOld(id), /^5\. 线宽/));
  console.log("  改后 5. " + line(buildNew(id), /^5\. 线宽/));
  const ho = line(buildOld(id), /首屏主标题取/), hn = line(buildNew(id), /首屏主标题取/);
  if (ho !== hn) { console.log("  改前 机制句 " + ho); console.log("  改后 机制句 " + hn); }
  console.log("  改后 总字数 " + buildNew(id).length);
}
