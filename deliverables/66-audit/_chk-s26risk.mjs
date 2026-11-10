import { readFileSync } from "node:fs";
const t = readFileSync("prototypes/_selection/data.js","utf8");
// 找 S26 的 risk 字段
const i = t.indexOf('"id": "S26"');
const seg = t.slice(i, i+9000);
const m = seg.match(/"risk":\s*"((?:[^"\\]|\\.)*)"/);
if (m) {
  const risk = m[1].replace(/\\"/g,'"').replace(/\\n/g," ");
  console.log("S26 risk 全文长度:", risk.length);
  console.log("含「10 号」次数:", (risk.match(/10 号/g)||[]).length);
  console.log("末 300 字:", risk.slice(-300));
} else console.log("未找到 risk");
