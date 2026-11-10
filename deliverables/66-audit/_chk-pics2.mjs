import { readFileSync, readdirSync } from "node:fs";
const dirs = readdirSync("prototypes",{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}-/.test(d.name)).map(d=>d.name).sort();
const cap = Object.fromEntries(JSON.parse(readFileSync("prototypes/_prompts/minitems-parsed.json","utf8").replace(/^\uFEFF/,"")).map(x=>[x.id,x]));
console.log("id  minPics  imgTotal  imgUnique  figureSlots");
const rows=[];
for (const d of dirs) {
  const t = readFileSync(`prototypes/${d}/index.html`,"utf8");
  const srcs = [...t.matchAll(/<img[^>]*\bsrc="([^"]+)"/g)].map(m=>m[1].split("/").pop());
  const uniq = new Set(srcs);
  const figs = (t.match(/<figure/g)||[]).length;
  const id = d.slice(0,3); const c=cap[id]||{};
  rows.push({id,minPics:c.minPics,imgTotal:srcs.length,imgUnique:uniq.size,figs});
  console.log(`${id}  ${String(c.minPics).padStart(6)}  ${String(srcs.length).padStart(8)}  ${String(uniq.size).padStart(9)}  ${String(figs).padStart(11)}  ${c.minPics>uniq.size?"⚠ minPics>unique":""}`);
}
