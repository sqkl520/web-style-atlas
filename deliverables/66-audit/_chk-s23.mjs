import { readFileSync } from "node:fs";
const t = readFileSync("prototypes/S23-exposed-plaster-chronology-wall/index.html","utf8");
const srcs = [...t.matchAll(/<img[^>]*\bsrc="([^"]+)"/g)].map(m=>m[1]);
console.log("total img:", srcs.length);
const u = {}; for (const s of srcs) u[s]=(u[s]||0)+1;
console.log(u);
