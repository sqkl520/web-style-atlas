import { readFileSync } from "node:fs";
for (const [id,d,pat] of [["S06","S06-showa-kissaten-ledger","card--blank"],["S01","S01-red-wedge-broadsheet","空缺"],["S18","S18-phosphor-service-deck","占位"]]) {
  const t=readFileSync(`prototypes/${d}/index.html`,"utf8");
  const n=(t.match(new RegExp(pat,"g"))||[]).length;
  console.log(`${id} 「${pat}」×${n}`);
  const i=t.indexOf(pat);
  if(i>=0) console.log("   " + t.slice(Math.max(0,i-140), i+120).replace(/\s+/g," "));
}
