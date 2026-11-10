import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync("deliverables/70-plan/redteam/type-dist.json","utf8"));
for (const [id,v] of Object.entries(d)) {
  const bodyP = v.proto.dist.filter(([f])=>f!==v.proto.h1px)[0][0];
  const bodyI = v.impl.dist.filter(([f])=>f!==v.impl.h1px)[0][0];
  console.log(`${id}: 原型 H1=${v.proto.h1px} 正文=${bodyP} 比=${(v.proto.h1px/bodyP).toFixed(2)} | 复刻 H1=${v.impl.h1px} 正文=${bodyI} 比=${(v.impl.h1px/bodyI).toFixed(2)}`);
}
