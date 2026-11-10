import { readFileSync } from "node:fs";
const U = JSON.parse(readFileSync("deliverables/66-audit/units.json","utf8"));
const M = JSON.parse(readFileSync("deliverables/66-audit/manifest.json","utf8"));
const cap = Object.fromEntries(JSON.parse(readFileSync("prototypes/_prompts/minitems-parsed.json","utf8").replace(/^\uFEFF/,"")).map(x=>[x.id,x]));
console.log("id  minPics imgUniq imgTotal  hard  degrades(cap/dna)  reuseLen riskLen");
for (const r of U) {
  const m = M.find(x=>x.id===r.id); const c = cap[r.id]||{};
  console.log(`${r.id}  ${String(c.minPics).padStart(6)} ${String(r.imgUnique).padStart(7)} ${String(r.imgTotal).padStart(8)}  ${m.hard?"Y":"n"}     ${c.degrades}/${m.degrades}          ${String(m.reuseLen).padStart(4)} ${String(m.riskLen).padStart(4)}`);
}
