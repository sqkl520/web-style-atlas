import { readFileSync } from "node:fs";
// 验证：9 案结构约束编号是否从 4 跳到 5 之后缺 5
const ids=["S02","S03","S04","S05","S06","S07","S08","S09","S10"];
for (const id of ids) {
  const t=readFileSync(`deliverables/66-audit/prompts/${id}.txt`,"utf8");
  const s=(t.match(/结构约束：\n([\s\S]*?)\n防退化（/)||[])[1]||"";
  const nums=s.split("\n").filter(l=>/^\s*\d\./.test(l)).map(l=>l.trim()[0]);
  console.log(id, "编号序列:", nums.join(""));
}
console.log("\n--- 有第5条的案 ---");
for (const id of ["S15","S19","S26"]) {
  const t=readFileSync(`deliverables/66-audit/prompts/${id}.txt`,"utf8");
  const s=(t.match(/结构约束：\n([\s\S]*?)\n防退化（/)||[])[1]||"";
  const nums=s.split("\n").filter(l=>/^\s*\d\./.test(l)).map(l=>l.trim()[0]);
  console.log(id, "编号序列:", nums.join(""));
}
