import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const p = "D:/Web/style/prototypes/_build/check-contract.mjs";
const src = readFileSync(p, "utf8");
const lines = src.split(/\r?\n/);
// 在第 64 行（return rows 之前）插入调试
const idx = lines.findIndex(l => l.trim() === "return rows;");
console.log("return rows at file line", idx + 1, ":", JSON.stringify(lines[idx]));
lines.splice(idx, 0,
  "  console.error('DBG i=' + i + ' j=' + j + ' secLen=' + sec.length + ' rows=' + rows.size);",
  "  console.error('DBG matchCount=' + sec.split(/\\\\r?\\\\n/).filter((l) => /^\\\\|\\\\s*`([\\\\w-]+)`\\\\s*\\\\|/.test(l)).length);");
writeFileSync("D:/Web/style/prototypes/_build/_probe-cc.mjs", lines.join("\n"), "utf8");
const CON="D:/Web/style/prototypes/_CONTRACT.md";
const orig=readFileSync(CON); const h=(b)=>createHash("sha256").update(b).digest("hex");
writeFileSync(CON, orig.toString("utf8").replace("| **不得横向溢出** |","| `shadow` | X | Y |\n| **不得横向溢出** |"), "utf8");
const r = spawnSync(process.execPath, ["prototypes/_build/_probe-cc.mjs"], { cwd:"D:/Web/style", encoding:"utf8" });
console.log("status=", r.status, "\nSTDERR:\n" + String(r.stderr));
writeFileSync(CON, orig);
console.log("restored:", h(readFileSync(CON))===h(orig));
