import { readFileSync } from "node:fs";
const U = JSON.parse(readFileSync("deliverables/66-audit/units.json","utf8"));
const M = JSON.parse(readFileSync("deliverables/66-audit/manifest.json","utf8"));
const cap = Object.fromEntries(JSON.parse(readFileSync("prototypes/_prompts/minitems-parsed.json","utf8").replace(/^\uFEFF/,"")).map(x=>[x.id,x]));
console.log("id   minPics  imgUniq  imgTotal  Δ(minPics-uniq)");
let bad=[];
for (const r of U) {
  const c = cap[r.id]||{};
  const d = c.minPics - r.imgUnique;
  if (d>0) bad.push(r.id+"(+"+d+")");
  console.log(`${r.id}  ${String(c.minPics).padStart(6)}  ${String(r.imgUnique).padStart(7)}  ${String(r.imgTotal).padStart(8)}   ${d>0?"+"+d:d}`);
}
console.log("\nminPics > 实际去重图片数：" + bad.join(" "));
