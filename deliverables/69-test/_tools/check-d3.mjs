// 核实 D3：有多少案的「配色」行 hex 数，与全提示词的 hex 数不同（因为有禁用色 #6366F1 混入）。
import { readFileSync } from 'node:fs';
const S = 'D:/Web/style/deliverables/69-test/_staging';
const idx = JSON.parse(readFileSync(`${S}/index.json`, 'utf8'));
let diff = 0;
const rows = [];
for (const r of idx) {
  const p = readFileSync(`${S}/prompt-${r.id}.txt`, 'utf8');
  const pal = (p.split('\n').find((l) => l.startsWith('1. 配色')) || '');
  const palHex = new Set((pal.match(/#[0-9A-Fa-f]{6}/g) || []).map((s) => s.toUpperCase()));
  const allHex = new Set((p.match(/#[0-9A-Fa-f]{6}/g) || []).map((s) => s.toUpperCase()));
  const outside = [...allHex].filter((h) => !palHex.has(h));
  if (outside.length) { diff++; rows.push({ id: r.id, pal: palHex.size, all: allHex.size, outside }); }
}
console.log(`配色行 hex 数 < 全文 hex 数的案 = ${diff}/30`);
for (const r of rows) console.log(`  ${r.id}  配色 ${r.pal} 个 / 全文 ${r.all} 个  多出: ${r.outside.join(' ')}`);
