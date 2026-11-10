import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const src = readFileSync("D:/Web/style/prototypes/_build/check-contract.mjs","utf8");
const inj = src.replace(
  "  const rows = new Map();",
  "  console.error('DBG mdLen=' + md.length + ' i=' + i + ' j=' + j + ' secLen=' + sec.length + ' hasShadowInSec=' + sec.includes('shadow'));\n  const rows = new Map();");
if (inj === src) throw new Error("inject failed");
writeFileSync("D:/Web/style/prototypes/_build/_probe-cc.mjs", inj, "utf8");
const CON="D:/Web/style/prototypes/_CONTRACT.md";
const orig=readFileSync(CON); const h=(b)=>createHash("sha256").update(b).digest("hex");
writeFileSync(CON, orig.toString("utf8").replace("| **不得横向溢出** |","| `shadow` | X | Y |\n| **不得横向溢出** |"), "utf8");
console.log("written len:", readFileSync(CON).length);
const r = spawnSync(process.execPath, ["prototypes/_build/_probe-cc.mjs"], { cwd:"D:/Web/style", encoding:"utf8" });
console.log("status=", r.status, "\nSTDERR:\n" + String(r.stderr).split("\n").filter(l=>l.includes("DBG")).join("\n"));
writeFileSync(CON, orig);
console.log("restored:", h(readFileSync(CON))===h(orig));
