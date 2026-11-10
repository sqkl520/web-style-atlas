import { readFileSync } from "node:fs";
const lock = JSON.parse(readFileSync("deliverables/70-plan/redteam/prompts30.json","utf8"));
for (const id of ["S20","S21","S28"]) {
  const r = lock.find(x=>x.id===id);
  console.log(id, "| h1Size(dna):", r.h1Size);
}
