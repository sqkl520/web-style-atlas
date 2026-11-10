import fs from "node:fs";
const files = ["S03","S05","S10","S14","S20","S15","S18","S21","S29"];
for (const id of files){
  const t = fs.readFileSync(`prototypes/_specs/${id}.md`,"utf8");
  const lines = t.split(/\r?\n/);
  // find 适用场景 line
  const idx = lines.findIndex(l => l.includes("适用场景"));
  console.log("==== "+id+" ==== (适用场景 at line "+(idx+1)+")");
  if(idx>=0) console.log(lines[idx].slice(0,700));
  const one = lines.find(l=>l.includes("一句话视觉定义"));
  if(one) console.log("[一句话] "+one.slice(0,260));
  console.log("");
}
