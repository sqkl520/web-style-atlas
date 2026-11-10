import fs from "node:fs";
const h = fs.readFileSync("templates/M01-clean-corporate/index.html","utf8");
const secs = [...h.matchAll(/<(section|header|footer|main|nav)[^>]*>/g)].map(m=>m[0].slice(0,110));
console.log("M01 结构：" ); secs.forEach(s=>console.log("  "+s));
console.log("\n导航项：");
const nav = h.match(/<nav[\s\S]{0,900}?<\/nav>/);
if (nav) console.log(nav[0].replace(/\s+/g," ").slice(0,700));
