import { readFileSync } from "node:fs";
const j = JSON.parse(readFileSync("deliverables/70-plan/redteam/prompts30.json","utf8"));
const noMech = j.filter(r=>!/签名动作/.test(r.prompt));
console.log("prompt without 签名动作:", noMech.map(r=>r.id));
// does any prompt contain h1Size string literally?
let c=0; for (const r of j){ const h=r.h1Size; if(h && r.prompt.includes(h)) c++; }
console.log("prompt contains its h1Size literal:", c, "/30");
const nonEmptyH1 = j.filter(r=>r.h1Size).length;
console.log("h1Size nonempty:", nonEmptyH1);
