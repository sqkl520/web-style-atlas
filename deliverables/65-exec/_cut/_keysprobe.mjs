import fs from "node:fs";
const before = JSON.parse(fs.readFileSync("deliverables/65-exec/_cut/before.json","utf8"));
console.log("S13 keys:", before.cases[12].keys.join(","));
console.log("S13 auditIdx=", before.cases[12].auditIdx, " riskIdx=", before.cases[12].riskIdx);
console.log("all auditIdx/riskIdx:", before.cases.map(c=>c.id+":"+c.auditIdx+"/"+c.riskIdx).join(" "));
