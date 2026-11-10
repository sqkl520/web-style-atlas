import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const src = readFileSync("D:/Web/style/prototypes/_build/check-contract.mjs","utf8");
const inj = src.replace("const engine = engineRuleIds();", "const engine = engineRuleIds();\nconsole.error('PARSE_KEYS=' + [...allow.keys()].join(','));\nconsole.error('PARSE_SIZE=' + allow.size);\nconsole.error('CONTRACT_PATH=' + CONTRACT);");
if (inj === src) throw new Error("injection failed");
writeFileSync("D:/Web/style/prototypes/_build/_probe-cc.mjs", inj, "utf8");
const CON="D:/Web/style/prototypes/_CONTRACT.md";
const orig=readFileSync(CON); const h=(b)=>createHash("sha256").update(b).digest("hex");
writeFileSync(CON, orig.toString("utf8").replace("| **不得横向溢出** |","| `shadow` | X | Y |\n| **不得横向溢出** |"), "utf8");
const { execSync } = await import("node:child_process");
let out, err;
try { out = execSync("node prototypes/_build/_probe-cc.mjs",{cwd:"D:/Web/style",encoding:"utf8",stdio:["ignore","pipe","pipe"]}); } catch(e){ out=e.stdout; }
console.log("STDOUT:\n"+out.split(/\r?\n/).filter(l=>/允许表\(|C3 登记|合计/.test(l)).join("\n"));
writeFileSync(CON, orig);
console.log("restored:", h(readFileSync(CON))===h(orig));
