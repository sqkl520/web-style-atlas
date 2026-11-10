import { readFileSync } from "node:fs";
const j = JSON.parse(readFileSync("deliverables/70-plan/redteam/prompts30.json","utf8"));
const pats = { 字号: /字号/, fontSize: /font-size/i, fontShorthand: /font:\s*\d/, rem: /\b\d+(\.\d+)?rem\b/, em: /\b\d+(\.\d)?em\b/, lineHeight: /行高|line-height/i, letterSpacing: /字距|letter-spacing/i, h1SizeWord: /主标题|大标题|标题取/ };
const rows = [];
for (const r of j) {
  const hit = {};
  for (const [k,re] of Object.entries(pats)) hit[k] = re.test(r.prompt) ? (r.prompt.match(re)||[]).slice(0,3).join("|") : "";
  // px values that are plausibly text sizes: px inside "首屏主标题取 N 这一档" or 15px /行高1.8 patterns from spec
  rows.push({ id: r.id, ...hit, h1Size: r.h1Size, len: r.len });
}
console.log("id  字号 font-size font: rem em 行高 字距 h1Size");
for (const x of rows) console.log(x.id, !!x.字号, !!x.fontSize, !!x.fontShorthand, !!x.rem, !!x.em, !!x.行高, !!x.字距, JSON.stringify(x.h1Size));
const n = (k) => rows.filter(x=>x[k]).length;
console.log("---counts---");
for (const k of Object.keys(pats)) console.log(k, n(k)+"/30");
console.log("h1Size nonempty:", rows.filter(x=>x.h1Size).length+"/30", JSON.stringify(rows.map(x=>x.id+":"+x.h1Size).filter(s=>!s.endsWith(":"))));
