import { readFileSync, readdirSync } from "node:fs";
const files = readdirSync("deliverables/66-audit/prompts").filter(f=>f.endsWith(".txt")).sort();
const cap = Object.fromEntries(JSON.parse(readFileSync("prototypes/_prompts/minitems-parsed.json","utf8").replace(/^\uFEFF/,"")).map(x=>[x.id,x]));
let mutex=[];
for (const f of files) {
  const id=f.slice(0,3);
  const t=readFileSync("deliverables/66-audit/prompts/"+f,"utf8");
  const seg = t.slice(t.indexOf("结构约束："), t.indexOf("防退化（"));
  const c1 = (seg.match(/^1\. 我实际有 (\d+) 个/gm)||[])[0]||"";
  const c2 = (seg.match(/^2\. ([^\n]*)/m)||[])[1]||"";
  const c1N = /我实际有 (\d+) 个/.exec(c1);
  const c2Own = /用你真实的/.test(c2);
  const c2N = /不足 (\d+) 个/.exec(c2);
  const consistent = c1N && c2N ? (c1N[1]===c2N[1]) : null;
  console.log(`${id} d=${cap[id].degrades.padEnd(3)} 第1条N=${c1N?c1N[1]:"-"}  第2条改为真实数量=${c2Own?"是":"否"}  第2条N=${c2N?c2N[1]:"-"}  ${consistent===false?"← N 不一致":""}`);
  if (c1N && c2Own) mutex.push(id);
}
console.log("\n>>> 第1条断言「我实际有 N」+ 第2条要求「用你真实的条目数」：" + mutex.length + " 案");
console.log("    " + mutex.join(" "));
