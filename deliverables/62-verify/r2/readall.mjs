// 把 30 条提示词里**每案不同**的行摊开（模板样板行先证明恒定，再只读变量行）
import fs from "node:fs";
import path from "node:path";

const A = "D:/Web/style/deliverables/62-verify/r2/prompts";   // 旧快照（19:19）
const B = "D:/Web/style/deliverables/62-verify/r2/prompts2";  // 冻结快照（19:29）
const ids = fs.readdirSync(B).filter((f) => /^S\d\d\.txt$/.test(f)).sort().map((f) => f.replace(".txt", ""));

// 1) 旧 vs 新 快照差异（证明"边验边改"）
console.log("=== 19:19 与 19:29 两版提示词差异 ===");
let changed = [];
for (const id of ids) {
  const a = fs.readFileSync(path.join(A, id + ".txt"), "utf8");
  const b = fs.readFileSync(path.join(B, id + ".txt"), "utf8");
  if (a !== b) changed.push(id);
}
console.log("变化的案子:", changed.length, "/30 →", changed.join(" "));

// 2) 检验样板行是否 30 案恒定
const texts = Object.fromEntries(ids.map((id) => [id, fs.readFileSync(path.join(B, id + ".txt"), "utf8").split("\n")]));
const maxLen = Math.max(...Object.values(texts).map((l) => l.length));
const constLines = [], varIdx = [];
for (let i = 0; i < maxLen; i++) {
  const vals = new Set(ids.map((id) => texts[id][i]));
  if (vals.size === 1) constLines.push(i); else varIdx.push(i);
}
console.log("\n=== 恒定行索引（30 案完全相同） ===");
console.log(constLines.map((i) => i + 1).join(" "));
console.log("=== 变化行索引 ===");
console.log(varIdx.map((i) => i + 1).join(" "));

console.log("\n\n=== 逐案变量行 ===");
for (const id of ids) {
  const L = texts[id];
  console.log("\n───────── " + id + " ─────────");
  for (const i of varIdx) if (L[i] !== undefined) console.log(String(i + 1).padStart(2) + "| " + L[i]);
}
