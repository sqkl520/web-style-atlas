import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const src = readFileSync("D:/Web/style/prototypes/_build/check-contract.mjs","utf8");
// 在函数内部按真实变量名打印
const inj = src.replace(
  "    rows.set(m[1], { rule: m[1], why: cells[2] || '', how: cells[3] || '' });",
  "    rows.set(m[1], { rule: m[1], why: cells[2] || '', how: cells[3] || '' });\n    console.error('DBG row ' + m[1]);");
if (inj === src) throw new Error("inject failed");
writeFileSync("D:/Web/style/prototypes/_build/_probe-cc.mjs", inj, "utf8");
const CON="D:/Web/style/prototypes/_CONTRACT.md";
const orig=readFileSync(CON); const h=(b)=>createHash("sha256").update(b).digest("hex");
writeFileSync(CON, orig.toString("utf8").replace("| **不得横向溢出** |","| `shadow` | X | Y |\n| **不得横向溢出** |"), "utf8");
const r = spawnSync(process.execPath, ["prototypes/_build/_probe-cc.mjs"], { cwd:"D:/Web/style", encoding:"utf8" });
console.log("status=", r.status, "\nSTDERR:\n" + String(r.stderr));
console.log("STDOUT:\n" + String(r.stdout).split(/\r?\n/).filter(l=>/允许表\(|C3 登记/.test(l)).join("\n"));
writeFileSync(CON, orig);
console.log("restored:", h(readFileSync(CON))===h(orig));
