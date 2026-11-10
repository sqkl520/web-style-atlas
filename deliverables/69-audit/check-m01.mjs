import fs from "node:fs";
const t = fs.readFileSync("templates/M01-clean-corporate/README.md","utf8");
console.log("--- M01 README first 6 lines ---");
console.log(t.split(/\r?\n/).slice(0,6).join("\n"));
console.log("\n--- 企业 occurrences in M01 README ---");
let i=0, n=0; const lines=t.split(/\r?\n/);
for(const l of lines){ n++; if(l.includes("企业")){ console.log("L"+n+": "+l.slice(0,160)); if(++i>5) break; } }
