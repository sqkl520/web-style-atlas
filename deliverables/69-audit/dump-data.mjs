import fs from "node:fs";
const src = fs.readFileSync("prototypes/_selection/data.js","utf8");
console.log("len", src.length);
const m = src.match(/hard/g);
console.log("hard occurrences in data.js:", m?m.length:0);
const d = src.match(/degrades/g);
console.log("degrades occurrences:", d?d.length:0);
// find window.X = assignments
for (const line of src.split(/\r?\n/)) { if (/^window\.[A-Z_]+|^\s{0,2}window\[/.test(line)) console.log(line.slice(0,120)); }
