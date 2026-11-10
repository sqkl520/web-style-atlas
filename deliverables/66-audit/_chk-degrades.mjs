import { readFileSync } from "node:fs";
const j = JSON.parse(readFileSync("prototypes/_prompts/minitems-parsed.json","utf8").replace(/^\uFEFF/,""));
const yes = j.filter(x=>x.degrades==="yes").map(x=>x.id);
console.log("JSON degrades=yes (" + yes.length + "): " + yes.join(" "));
// 报告正文表格里的值
const md = readFileSync("deliverables/60-minitems-degrade-audit.md","utf8");
const rows = [...md.matchAll(/^\| (S\d{2})[^|]*\| (\d+) \| (yes|no) \|/gm)].map(m=>({id:m[1],n:m[2],d:m[3]}));
console.log("报告表格行数: " + rows.length);
const mdYes = rows.filter(r=>r.d==="yes").map(r=>r.id);
console.log("报告表格 degrades=yes (" + mdYes.length + "): " + mdYes.join(" "));
// 差异
const jSet=new Set(yes), mSet=new Set(mdYes);
console.log("\n只在 JSON 里 yes： " + yes.filter(x=>!mSet.has(x)).join(" ") || "无");
console.log("只在报告里 yes： " + mdYes.filter(x=>!jSet.has(x)).join(" ") || "无");
// 报告第 74 行的清单
const listLine = md.split("\n").find(l=>l.includes("13 案")&&l.includes("S02"));
console.log("\n报告清单行: " + (listLine||"").trim());
// minItems 对比
console.log("\nminItems 差异:");
for (const r of rows) { const x=j.find(y=>y.id===r.id); if (x && Number(r.n)!==x.minItems) console.log(`  ${r.id} 报告=${r.n} JSON=${x.minItems}`); }
