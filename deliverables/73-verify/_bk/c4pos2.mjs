import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const ROOT="D:/Web/style", CON=`${ROOT}/prototypes/_CONTRACT.md`;
const sha=(p)=>createHash("sha256").update(readFileSync(p)).digest("hex").slice(0,16);
const orig=readFileSync(CON); const h=sha(CON);
// 在 §6 表里造一条「S21 有 5 处 button-fx 属真未修」，而实测 S21 button-fx=0
const s=orig.toString("utf8");
const inj=s.replace("| **不得横向溢出** |", "| `S21` 有 5 处 `button-fx` 属真未修 | x |\n| **不得横向溢出** |");
writeFileSync(CON, inj, "utf8");
const r=spawnSync(process.execPath,["prototypes/_build/check-contract.mjs"],{cwd:ROOT,encoding:"utf8"});
console.log("exit=",r.status);
console.log(String(r.stdout).split(/\r?\n/).filter(l=>/C4|合计|C2/.test(l)).join("\n"));
writeFileSync(CON, orig);
console.log("restored:", sha(CON)===h);
