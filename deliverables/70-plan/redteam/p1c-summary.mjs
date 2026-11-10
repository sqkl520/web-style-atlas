import { readFileSync } from "node:fs";
const rows = JSON.parse(readFileSync("deliverables/70-plan/redteam/p1b-color.json","utf8"));
console.log("id | 声称 | DOM-A | DOM-B | PX-D | 遮罩 | 未画");
for (const r of rows) console.log(`${r.id} | ${r.claimed.length} | ${r.domA.length} | ${r.domB.length} | ${r.pxD.length} | ${r.masks} | ${r.missing.join(",")||"-"}`);
console.log("\n=== DOM-B 逐条（面积降序，只列 areaPct>=0.5 或 n>=50）===");
for (const r of rows) {
  const big = r.domB.filter(x=>x.areaPct>=0.5||x.n>=50);
  if(!big.length) continue;
  console.log(`\n${r.id}:`);
  for (const x of big) console.log(`   ${x.hex} n=${x.n} area=${x.areaPct}% ΔE=${x.dE}→${x.nearest} spec=${x.inSpec} cur=${x.inCurrent} | ${x.sample}`);
}
console.log("\n=== spec 里明写、但提示词色板没有的集合外色（抽取漏 = 该补进色板）===");
for (const r of rows) {
  const s = [...r.domA, ...r.domB.map(x=>x)].filter(x=>x.inSpec||x.inCurrent);
  const uniq = [...new Map(s.map(x=>[x.hex,x])).values()];
  if (uniq.length) console.log(r.id, uniq.map(x=>`${x.hex}(area ${x.areaPct}%, n${x.n}, ΔE${x.dE})`).join(" "));
}
