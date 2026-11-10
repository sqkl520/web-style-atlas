import fs from "node:fs";
const p = JSON.parse(fs.readFileSync("deliverables/69-audit/probe-plans.json","utf8"));
console.log("390 plan3: card top", p["390"].plan3_reorder.cardTop, "openLink", p["390"].plan3_reorder.openLinkTop);
console.log("1024 baseline firstTop", p["1024"].baseline.firstTop, "slack", p["1024"].baseline.firstSlack, "fully", p["1024"].baseline.fully);
const f = JSON.parse(fs.readFileSync("deliverables/69-audit/probe-final.json","utf8"));
console.log("390 restaurant card visPx", f.m390rest.card.visPx, "pct", (f.m390rest.card.visPx/f.m390rest.card.h*100).toFixed(1));
console.log("link screens", f.m390rest.link.screens, "visPx", f.m390rest.link.visPx);
