import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const src = readFileSync("D:/Web/style/prototypes/_build/check-contract.mjs","utf8");
const anchor = "    const m = line.match(/^\\|\\s*`([\\w-]+)`\\s*\\|/);";
if (!src.includes(anchor)) { console.log("ANCHOR MISS"); process.exit(1); }
const dbg = anchor + "\n    if (line.includes('shadow')) console.error('DBG line has shadow: ' + JSON.stringify(line.slice(0,70)) + ' match=' + JSON.stringify(m && m[1]));";
writeFileSync("D:/Web/style/prototypes/_build/_probe-cc.mjs", src.replace(anchor, dbg), "utf8");
const CON="D:/Web/style/prototypes/_CONTRACT.md";
const orig=readFileSync(CON); const h=(b)=>createHash("sha256").update(b).digest("hex");
writeFileSync(CON, orig.toString("utf8").replace("| **不得横向溢出** |","| `shadow` | X | Y |\n| **不得横向溢出** |"), "utf8");
const r = spawnSync(process.execPath, ["prototypes/_build/_probe-cc.mjs"], { cwd:"D:/Web/style", encoding:"utf8" });
console.log("STDERR:\n" + String(r.stderr));
console.log("summary:", String(r.stdout).split(/\r?\n/).filter(l=>/允许表\(|C3/.test(l)).join(" | "));
writeFileSync(CON, orig);
console.log("restored:", h(readFileSync(CON))===h(orig));
