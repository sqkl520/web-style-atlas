import { readFileSync, readdirSync } from "node:fs";
const files = readdirSync("deliverables/66-audit/prompts").filter(f=>f.endsWith(".txt")).sort();
console.log("=== risk 行是否被 220 字截断（以 … 结尾）===");
for (const f of files) {
  const t = readFileSync("deliverables/66-audit/prompts/"+f,"utf8");
  const m = t.match(/这一案最容易做成的错误样子[^\n]*/);
  if (!m) { console.log(f, "无 risk 行"); continue; }
  const line = m[0];
  const body = line.replace(/^这一案最容易做成的错误样子（作者原话，务必避开）：/,"");
  const trunc = body.endsWith("…");
  if (trunc) console.log(`${f}  截断  len=${body.length}  尾部: ...${body.slice(-46)}`);
}
console.log("\n=== reuse(第5条) 是否存在 ===");
for (const f of files) {
  const t = readFileSync("deliverables/66-audit/prompts/"+f,"utf8");
  const has = /\n5\. 这个版式的硬前提/.test(t);
  if (!has) console.log(f, "无第5条");
}
