import { readFileSync, readdirSync } from "node:fs";
const files = readdirSync("deliverables/66-audit/prompts").filter(f=>f.endsWith(".txt")).sort();
const no5 = files.filter(f=>{const t=readFileSync("deliverables/66-audit/prompts/"+f,"utf8");return !/^5\. 这个版式的硬前提/m.test(t);});
console.log("无第5条的案件数:", no5.length, "→", no5.map(f=>f.slice(0,3)).join(" "));
const yes5 = files.filter(f=>{const t=readFileSync("deliverables/66-audit/prompts/"+f,"utf8");return /^5\. 这个版式的硬前提/m.test(t);});
console.log("有第5条:", yes5.length, "→", yes5.map(f=>f.slice(0,3)).join(" "));
