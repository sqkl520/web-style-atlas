import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const src = readFileSync("D:/Web/style/prototypes/_build/check-contract.mjs","utf8");
const inj = src.replace(
  "  return rows;\n}",
  "  console.error('DBG i=' + i + ' secLen=' + sec.length + ' rows=' + rows.size + ' keys=' + [...rows.keys()].join(','));\n  console.error('DBG mdLen=' + md.length + ' hasShadowRow=' + md.includes('`shadow` | X | Y'));\n  return rows;\n}");
if (inj === src) throw new Error("inject failed");
writeFileSync("D:/Web/style/prototypes/_build/_probe-cc.mjs", inj, "utf8");
const CON="D:/Web/style/prototypes/_CONTRACT.md";
const orig=readFileSync(CON); const h=(b)=>createHash("sha256").update(b).digest("hex");
writeFileSync(CON, orig.toString("utf8").replace("| **不得横向溢出** |","| `shadow` | X | Y |\n| **不得横向溢出** |"), "utf8");
console.log("disk md5 len:", readFileSync(CON).length, "has row:", readFileSync(CON,"utf8").includes('`shadow` | X | Y'));
const r = spawnSync(process.execPath, ["prototypes/_build/_probe-cc.mjs"], { cwd:"D:/Web/style", encoding:"utf8" });
console.log("status=", r.status, "\nSTDERR:\n" + String(r.stderr));
writeFileSync(CON, orig);
console.log("restored:", h(readFileSync(CON))===h(orig));
