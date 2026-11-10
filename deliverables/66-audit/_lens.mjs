import { readFileSync, readdirSync } from "node:fs";
const files = readdirSync("deliverables/66-audit/prompts").filter(f=>f.endsWith(".txt")).sort();
const lens = files.map(f=>readFileSync("deliverables/66-audit/prompts/"+f,"utf8").length);
console.log("HEAD 版字符数: min="+Math.min(...lens)+" max="+Math.max(...lens)+" 均="+(lens.reduce((a,b)=>a+b,0)/30).toFixed(0)+" 总="+lens.reduce((a,b)=>a+b,0));
const live = readdirSync("deliverables/66-audit/prompts-live").filter(f=>f.endsWith(".txt")).sort();
const l2 = live.map(f=>readFileSync("deliverables/66-audit/prompts-live/"+f,"utf8").length);
console.log("LIVE 版字符数: min="+Math.min(...l2)+" max="+Math.max(...l2)+" 均="+(l2.reduce((a,b)=>a+b,0)/30).toFixed(0));
