import { readFileSync } from "node:fs";
const j = JSON.parse(readFileSync("deliverables/70-plan/redteam/prompts30.json","utf8"));
let hitG = 0, hitH1 = 0, hitClamp = 0;
for (const r of j) {
  const hasH1line = r.prompt.includes("首屏主标题取");
  const clampM = r.prompt.match(/clamp\([^)]*\)/g) || [];
  const pxText = r.prompt.match(/\d+(\.\d+)?px/g) || [];
  if (hasH1line) hitH1++;
  if (clampM.length) hitClamp++;
  console.log(r.id, "| 首屏主标题取:", hasH1line, "| clamp:", JSON.stringify(clampM), "| px:", [...new Set(pxText)].join(","));
  if (r.prompt.includes("字号")) console.log("   >>> 字号句:", r.prompt.split("\n").filter(l=>l.includes("字号")).join(" || "));
}
console.log("--- 首屏主标题取 present:", hitH1, "/30 ; clamp present:", hitClamp, "/30");
