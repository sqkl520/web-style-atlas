import { readFileSync, readdirSync } from "node:fs";
const files = readdirSync("deliverables/66-audit/prompts").filter(f=>f.endsWith(".txt")).sort();
// 只抓「线宽/描边/栏线/stroke/外线/内线/环线/框线」后面紧跟的 px
const RE = /(线宽|描边|栏线|外线|内线|环线|框线|stroke|框边|边框|边条)[^\d%]{0,6}(\d+(?:\.\d+)?)\s*px/g;
for (const f of files) {
  const id=f.slice(0,3);
  const t = readFileSync("deliverables/66-audit/prompts/"+f,"utf8");
  const mech = (t.match(/这个风格的签名动作：([^\n]*)/)||[])[1]||"";
  const lw = (t.match(/5\. 线宽只用这几级：([^，]*)，/)||[])[1]||"";
  const allowed = [...new Set((lw.match(/\d+(?:\.\d+)?px/g)||[]).map(s=>parseFloat(s)))];
  const hits = [...mech.matchAll(RE)].map(m=>({noun:m[1], v:parseFloat(m[2])}));
  if (!hits.length) continue;
  const bad = hits.filter(h=>!allowed.includes(h.v));
  console.log(`${id} 白名单[${allowed.join(",")}]  机制句: ` + hits.map(h=>`${h.noun}${h.v}px${allowed.includes(h.v)?"✓":"✗"}`).join("  ") + (bad.length?"   <<< 冲突":""));
}
