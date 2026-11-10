import fs from "node:fs";
const d = JSON.parse(fs.readFileSync("deliverables/69-audit/probe-discover.json","utf8"));
console.log("chipBadges count:", d.chipBadges.length);
console.log(d.chipBadges.map(x=>x.term+"→"+x.badge).join(" "));
