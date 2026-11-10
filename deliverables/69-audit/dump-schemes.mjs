import fs from "node:fs";
const src = fs.readFileSync("prototypes/_selection/prompts.js","utf8");
global.window = {};
new Function("window", src)(global.window);
const P = global.window.STYLE_PROMPTS;
for (const s of P.schemes){
  console.log([s.id, s.hard?("hard="+JSON.stringify(s.hard)):"hard=-", s.minItems, s.minPics, s.capacity, (s.scenes||[]).join("|")].join("  "));
}
