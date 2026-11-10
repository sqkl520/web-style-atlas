import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
const CON="D:/Web/style/prototypes/_CONTRACT.md";
const orig=readFileSync(CON); const h=(b)=>createHash("sha256").update(b).digest("hex");
const s=orig.toString("utf8");
writeFileSync(CON, s.replace("| **不得横向溢出** |","| `shadow` | X | Y |\n| **不得横向溢出** |"), "utf8");
const before=h(readFileSync(CON));
let out; try{ out=execSync("node prototypes/_build/check-contract.mjs --json",{cwd:"D:/Web/style",encoding:"utf8"});}catch(e){out=e.stdout;}
const after=h(readFileSync(CON));
const j=JSON.parse(out);
console.log("sha before gate:", before.slice(0,12));
console.log("sha after  gate:", after.slice(0,12));
console.log("allowRules:", j.stats.allowRules);
// 同一进程内用闸门同样的代码复算
const md=readFileSync(CON,"utf8");
const i=md.indexOf("9.15"), jj=md.indexOf("9.16", i);
const re=/^\|\s*`([\w-]+)`\s*\|/;
console.log("in-process matches:", md.slice(i,jj).split(/\r?\n/).filter(l=>re.test(l)).length);
writeFileSync(CON, orig);
console.log("restored:", h(readFileSync(CON))===h(orig));
