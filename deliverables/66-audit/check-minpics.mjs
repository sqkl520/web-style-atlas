import { readFileSync, readdirSync } from "node:fs";
const dirs = readdirSync("prototypes",{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}-/.test(d.name)).map(d=>d.name).sort();
const cap = Object.fromEntries(JSON.parse(readFileSync("prototypes/_prompts/minitems-parsed.json","utf8").replace(/^\uFEFF/,"")).map(x=>[x.id,x]));
console.log("id  minPics  uniqueImgs  imgTags  Δ");
let violations=[];
for (const d of dirs) {
  const t = readFileSync(`prototypes/${d}/index.html`,"utf8");
  const srcs = [...t.matchAll(/<img[^>]*\bsrc="([^"]+)"/g)].map(m=>m[1].split("/").pop());
  const uniq = new Set(srcs).size;
  const id=d.slice(0,3); const c=cap[id]||{};
  const delta = c.minPics - uniq;
  if (delta>0) violations.push(`${id}(minPics=${c.minPics} 实际不同图=${uniq} 差+${delta})`);
  console.log(`${id}  ${String(c.minPics).padStart(6)}  ${String(uniq).padStart(10)}  ${String(srcs.length).padStart(7)}  ${delta>0?"+"+delta:delta}`);
}
console.log("\n>>> 提示词要求 N 个**不同**图片位，但原型自身不同图片数 < N：");
console.log("    " + (violations.join("  ") || "无"));
