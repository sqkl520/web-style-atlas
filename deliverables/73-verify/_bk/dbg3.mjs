import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
const CON="D:/Web/style/prototypes/_CONTRACT.md";
const orig=readFileSync(CON); const h=(b)=>createHash("sha256").update(b).digest("hex");
const s=orig.toString("utf8");
const ins=s.replace("| **不得横向溢出** |","| `shadow` | X | Y |\n| **不得横向溢出** |");
writeFileSync(CON, ins, "utf8");
console.log("disk sha after write:", h(readFileSync(CON)).slice(0,12), "len", readFileSync(CON).length);
console.log("gate sees distinct __proto__?", readFileSync(CON,"utf8").includes("`shadow`"));
let out; try{ out=execSync("node prototypes/_build/check-contract.mjs --json",{cwd:"D:/Web/style",encoding:"utf8"});}catch(e){out=e.stdout;}
const j=JSON.parse(out);
console.log("allowRules =", j.stats.allowRules, "engineRules =", j.stats.engineRules);
writeFileSync(CON, orig);
console.log("restored:", h(readFileSync(CON))===h(orig));
