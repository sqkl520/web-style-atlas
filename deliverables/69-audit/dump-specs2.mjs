import fs from "node:fs";
for (const id of ["S14","S15","S18","S20"]){
  const t = fs.readFileSync(`prototypes/_specs/${id}.md`,"utf8");
  const lines = t.split(/\r?\n/);
  const i = lines.findIndex(l => l.includes("适用场景"));
  console.log("==== "+id+" ====");
  console.log(lines.slice(i, i+4).join("\n").slice(0,1200));
  console.log("");
}
