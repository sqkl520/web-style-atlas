import { readFileSync } from "node:fs";
const C = JSON.parse(readFileSync("deliverables/66-audit/constraints.json","utf8"));
for (const id of ["S01","S19","S26"]) {
  const r = C.find(x=>x.id===id);
  console.log("\n### "+id+" total="+r.total);
  for (const g of r.groups) console.log(`  ${g.g} = ${g.n}   ${g.why}`);
  console.log("  mechSpecs:", r.mechSpecs.join(" | "));
}
