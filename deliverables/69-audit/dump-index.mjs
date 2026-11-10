import fs from "node:fs";
const src = fs.readFileSync("prototypes/_selection/prompts.js","utf8");
global.window = {};
new Function("window", src)(global.window);
const P = global.window.STYLE_PROMPTS;
console.log("top keys:", Object.keys(P).join(","));
const idx = P.sceneIndex;
const terms = Object.keys(idx);
console.log("term count:", terms.length);
let direct=0, nearOnly=0, neither=0;
for (const t of terms){
  const d = (idx[t].direct||[]).length, n=(idx[t].near||[]).length;
  if(d) direct++; else if(n) nearOnly++; else neither++;
}
console.log({direct, nearOnly, neither});
fs.writeFileSync("deliverables/69-audit/sceneIndex.json", JSON.stringify(P.sceneIndex,null,1));
console.log(terms.map(t=>t+":"+((idx[t].direct||[]).join("/")||"-")+":"+((idx[t].near||[]).join("/")||"-")).join("\n"));
