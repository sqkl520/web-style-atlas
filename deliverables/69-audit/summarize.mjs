import fs from "node:fs";
const a = JSON.parse(fs.readFileSync("deliverables/69-audit/probe-44-raw.json","utf8"));
const b = JSON.parse(fs.readFileSync("deliverables/69-audit/probe-29-raw.json","utf8"));
const zero44 = a.filter(r=>r.rows===0);
const zero29 = b.filter(r=>r.rows===0);
console.log("44 terms: total",a.length,"zero-row",zero44.length, zero44.map(r=>r.term).join(" "));
console.log("29 unsup: total",b.length,"zero-row",zero29.length, "NOT zero:", b.filter(r=>r.rows>0).map(r=>r.term+"="+r.rows).join(","));
console.log("all 73 zero-row:", zero44.length+zero29.length);
// distinct union of zero-hit terms
const z = new Set([...zero44,...zero29].map(r=>r.term));
console.log("distinct zero-hit terms:", z.size);
// terms with template cards in empty
console.log("\n-- zero-hit with template card --");
for(const r of [...zero44,...zero29]) if(r.etplCards.length) console.log(r.term, r.etplCards.join(","));
console.log("\n-- rows>0 with strip --");
for(const r of a) if(r.stripVisible) console.log(r.term, "rows="+r.rows, r.stripCards.join(","), "|", r.stripLead.slice(0,120));
