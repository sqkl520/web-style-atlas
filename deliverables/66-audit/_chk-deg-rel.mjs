import { readFileSync } from "node:fs";
const cap = Object.fromEntries(JSON.parse(readFileSync("prototypes/_prompts/minitems-parsed.json","utf8").replace(/^\uFEFF/,"")).map(x=>[x.id,x]));
const main = JSON.parse(readFileSync("deliverables/66-audit/main-units.json","utf8"));
for (const r of main) {
  const c = cap[r.id];
  if (c.degrades!=="yes") continue;
  console.log(`${r.id} N=${c.minItems} DOM=${r.dom} 父级数=${r.parentCount} ${r.note}`);
}
console.log("\n--- degrades=no ---");
for (const r of main) {
  const c = cap[r.id];
  if (c.degrades!=="no") continue;
  console.log(`${r.id} N=${c.minItems} DOM=${r.dom} 父级数=${r.parentCount}`);
}
