// r4-findings.mjs — 把 inspect.mjs --json 的 findings 按规则聚合打印
//   node r4-findings.mjs <inspect.json>
import { readFileSync } from 'node:fs';
const p = process.argv[2];
let raw = readFileSync(p, 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const d = JSON.parse(raw);
const byId = new Map();
for (const f of d.findings) {
  const k = f.level + ' ' + f.id;
  if (!byId.has(k)) byId.set(k, []);
  byId.get(k).push({ w: f.width, msg: f.message });
}
console.log(`viewports: ${d.viewports.map((v) => v.width + 'x' + v.height).join(', ')}`);
console.log(`findings: ${d.findings.length}\n`);
for (const k of [...byId.keys()].sort()) {
  const list = byId.get(k);
  console.log(`${k}   ×${list.length}`);
  for (const { w, msg } of list) console.log(`   ${String(w).padStart(4)}px  ${msg.slice(0, 220)}`);
  console.log('');
}
// 关心四条规则的原文
for (const id of ['emoji', 'body-size', 'small-text', 'focal-point']) {
  const hits = d.findings.filter((f) => f.id === id);
  console.log(`[${id}] ${hits.length ? hits.map((h) => h.level + '@' + h.width).join(', ') : 'NOT PRESENT'}`);
}
