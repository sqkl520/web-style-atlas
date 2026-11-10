import { readFileSync, readdirSync } from "node:fs";
const files = readdirSync("deliverables/66-audit/prompts-live").filter(f=>f.endsWith(".txt")).sort();
let n=0;
for (const f of files) {
  const t=readFileSync("deliverables/66-audit/prompts-live/"+f,"utf8");
  const struct = (t.match(/结构约束：\n([\s\S]*?)\n防退化（/)||[])[1]||"";
  n = struct.split("\n").filter(l=>/^\s*\d\./.test(l)).length;
}
console.log("live 结构约束条数样例(S07):", (()=>{const t=readFileSync("deliverables/66-audit/prompts-live/S07.txt","utf8");const s=(t.match(/结构约束：\n([\s\S]*?)\n防退化（/)||[])[1]||"";return s.split("\n").filter(l=>/^\s*\d\./.test(l)).length})());
