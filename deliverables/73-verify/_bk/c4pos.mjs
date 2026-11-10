import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const ROOT="D:/Web/style", EN=`${ROOT}/README-EN.md`;
const sha=(p)=>createHash("sha256").update(readFileSync(p)).digest("hex").slice(0,16);
const orig=readFileSync(EN); const h=sha(EN);
// 造一条**肯定语气**的欠款声称，且规则确实为 0
const add = '\n- ❌ `S21` has 5 occurrences of `button-fx` that are genuinely unresolved.\n';
writeFileSync(EN, orig.toString("utf8")+add, "utf8");
const r=spawnSync(process.execPath,["prototypes/_build/check-contract.mjs"],{cwd:ROOT,encoding:"utf8"});
console.log("exit=",r.status);
console.log(String(r.stdout).split(/\r?\n/).filter(l=>/C4|合计/.test(l)).join("\n"));
writeFileSync(EN, orig);
console.log("restored:", sha(EN)===h);
