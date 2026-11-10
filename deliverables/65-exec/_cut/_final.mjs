import fs from "node:fs"; import vm from "node:vm";
const sb={window:{}}; vm.runInNewContext(fs.readFileSync("prototypes/_selection/data.js","utf8"),sb);
const R=sb.window.SCHEMES;
console.log("  audit 总字 = " + R.reduce((n,r)=>n+String(r.audit||"").length,0));
const a=R.find(r=>r.id==="S13").audit;
console.log("  S13 = " + a.length + "，含污染串 = " + ["反套路改造三指标","打勾","供 V-11"].filter(k=>a.includes(k)).length);
const ok=R.filter(r=>{const k=Object.keys(r); return k.indexOf("audit")<k.indexOf("risk")&&k.indexOf("audit")>=0;}).length;
console.log("  auditIdx<riskIdx = " + ok + "/30");
