import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const CON="D:/Web/style/prototypes/_CONTRACT.md";
const orig=readFileSync(CON); const h=(b)=>createHash("sha256").update(b).digest("hex");
writeFileSync(CON, orig.toString("utf8").replace("| **不得横向溢出** |","| `shadow` | X | Y |\n| **不得横向溢出** |"), "utf8");
// 完全照抄闸门的 parseAllowTable
const md = readFileSync("D:/Web/style/prototypes/_CONTRACT.md", "utf8");
const i = md.indexOf("9.15");
console.log("i =", i, " char at i:", JSON.stringify(md.slice(i-20, i+10)));
const j = md.indexOf("9.16", i);
console.log("j =", j);
const sec = j > 0 ? md.slice(i, j) : md.slice(i);
console.log("sec first line:", JSON.stringify(sec.split(/\r?\n/)[0]));
const rows = new Map();
for (const line of sec.split(/\r?\n/)) {
  const m = line.match(/^\|\s*`([\w-]+)`\s*\|/);
  if (!m) continue;
  rows.set(m[1], { rule: m[1] });
}
console.log("rows.size =", rows.size, [...rows.keys()].join(","));
writeFileSync(CON, orig);
console.log("restored:", h(readFileSync(CON))===h(orig));
