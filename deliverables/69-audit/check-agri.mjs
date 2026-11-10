import fs from "node:fs";
const src = fs.readFileSync("prototypes/_selection/data.js","utf8");
global.window = {};
new Function("window", src)(global.window);
const S = global.window.SCHEMES;
for (const s of S){
  const hay = JSON.stringify(s);
  if (hay.includes("农业")) console.log("农业 in", s.id, "→", (hay.match(/.{0,60}农业.{0,60}/)||[""])[0]);
}
console.log("--- S19 scenes ---");
const s19 = S.find(s=>s.id==="S19");
console.log(JSON.stringify({id:s19.id, cn:s19.cn, scenes:s19.scenes, scenesYes:s19.scenesYes}, null, 1).slice(0,1200));
