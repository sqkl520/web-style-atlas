import fs from "node:fs";
const src = fs.readFileSync("prototypes/_selection/prompts.js","utf8");
global.window = {};
new Function("window", src)(global.window);
const t = Object.keys(global.window.STYLE_PROMPTS.sceneIndex);
fs.writeFileSync("deliverables/69-audit/terms.json", JSON.stringify(t));
console.log(t.length);
