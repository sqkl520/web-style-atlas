import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('prototypes/_build/collect-schemes.mjs','utf8');
const anchor = "  if (pal.length >= 2 && (!rec.primary || rec.primary === rec.bg || !pal.includes(rec.primary))) {";
if (!s.includes(anchor)) { console.error('anchor 未找到'); process.exit(1); }
s = s.replace(anchor, "  if (id === 'S01') console.log('__RAW__');\n  console.log('__P__ ' + JSON.stringify({id, raw: rec.primary, bg: rec.bg, pal}));\n" + anchor);
writeFileSync('deliverables/65-exec/_raw-primary-probe.mjs', s, 'utf8');
console.log('已生成探针（在兜底前打印原始 primary）');
