import { readFileSync, readdirSync } from "node:fs";
const files = readdirSync("deliverables/66-audit/prompts").filter(f=>f.endsWith(".txt")).sort();
console.log("id   级数  第5条原文");
for (const f of files) {
  const t = readFileSync("deliverables/66-audit/prompts/"+f,"utf8");
  const lw = (t.match(/5\. 线宽只用这几级：([^，]*)，([^\n]*)/)||[]);
  const vals = (lw[1]||"").split("、").filter(Boolean);
  console.log(`${f.slice(0,3)}  ${String(vals.length).padStart(3)}  ${lw[1]}，${lw[2]||""}`);
}
