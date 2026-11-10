import { readFileSync } from "node:fs";
const t = readFileSync("prototypes/S18-phosphor-service-deck/index.html","utf8");
const pres = [...t.matchAll(/<pre class="lines"/g)];
console.log("pre.lines 段数:", pres.length);
// 每段内 span.ln 计数
const blocks = t.split(/<pre class="lines"/).slice(1);
blocks.forEach((b,i)=>{
  const seg = b.slice(0, b.indexOf("</pre>"));
  console.log(`  段${i+1}: span.ln=${(seg.match(/<span class="ln"/g)||[]).length}`);
});
console.log("全文 span class=ln 命中:", (t.match(/<span class="ln/g)||[]).length);
console.log("\n--at 硬编码索引:", [...t.matchAll(/--at:\s*(\d+)/g)].map(m=>m[1]).join(","));
console.log("hang 数量:", (t.match(/<div class="hang"/g)||[]).length);
