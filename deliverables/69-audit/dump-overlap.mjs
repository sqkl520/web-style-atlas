import fs from "node:fs";
const src = fs.readFileSync("prototypes/_selection/prompts.js","utf8");
global.window = {};
new Function("window", src)(global.window);
const P = global.window.STYLE_PROMPTS;
const hard = P.schemes.filter(s=>s.hard).map(s=>s.id);
const deg  = P.schemes.filter(s=>s.capacity && s.capacity.degrades==="yes").map(s=>s.id);
console.log("hard field true:", hard.length, hard.join(","));
console.log("hardIds:", P.hardIds.length, P.hardIds.join(","));
console.log("degrades=yes:", deg.length, deg.join(","));
const union=[...new Set([...hard,...deg])].sort();
console.log("union:", union.length, union.join(","));
console.log("intersection:", hard.filter(x=>deg.includes(x)).join(","));
console.log("deg only:", deg.filter(x=>!hard.includes(x)).join(","));
console.log("hard only:", hard.filter(x=>!deg.includes(x)).join(","));
console.log("--- capacity sample:", JSON.stringify(P.schemes[0].capacity));
console.log("--- hard field sample S15:", JSON.stringify(P.schemes[14].hard));
for (const s of P.schemes){ if(s.hard||s.capacity.degrades==="yes") console.log(s.id, "hard="+!!s.hard, "deg="+s.capacity.degrades, "minItems="+s.minItems, "cap="+JSON.stringify(s.capacity)); }
