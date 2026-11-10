import fs from "node:fs";
const src = fs.readFileSync("prototypes/_selection/prompts.js","utf8");
global.window = {};
new Function("window", src)(global.window);
fs.writeFileSync("deliverables/69-audit/terms-unsup.json", JSON.stringify(global.window.STYLE_PROMPTS.unsupported));
console.log(global.window.STYLE_PROMPTS.unsupported.length);
