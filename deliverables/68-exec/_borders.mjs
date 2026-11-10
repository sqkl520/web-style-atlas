// 精确统计 style.css 的边框类型分布（剥注释），给报告用。
import { readFileSync } from 'node:fs';
const raw = readFileSync('prototypes/_selection/style.css', 'utf8');
const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
const lines = stripped.split(/\r?\n/);
const rawLines = raw.split(/\r?\n/);

const single = [];   // border-top/right/bottom/left: Wpx
const allSideSolid = [];
const allSideOther = [];
lines.forEach((l, i) => {
  for (const m of l.matchAll(/border-(top|right|bottom|left)\s*:\s*([\d.]+)px/g)) single.push({ line: i + 1, side: m[1], w: m[2], text: rawLines[i].trim() });
  for (const m of l.matchAll(/border\s*:\s*([\d.]+)px\s+(solid|dashed|dotted|none)/g)) (m[2] === 'solid' ? allSideSolid : allSideOther).push({ line: i + 1, w: m[1], style: m[2], text: rawLines[i].trim() });
});
const byW = {};
for (const s of single) byW[s.w] = (byW[s.w] || 0) + 1;
console.log('单边 border-*: Npx 分布:', JSON.stringify(byW));
console.log('\n单边 1px / 0.5px（lint hairline 命中）：');
for (const s of single.filter((s) => s.w === '1' || s.w === '0.5')) console.log(`  L${s.line}  border-${s.side}: ${s.w}px   ${s.text.slice(0, 80)}`);

console.log(`\n四面 border: Npx solid = ${allSideSolid.length} 处（lint 归 outlined-box WARN，不归 hairline）`);
for (const s of allSideSolid) console.log(`  L${s.line}  ${s.w}px  ${s.text.slice(0, 70)}`);
console.log(`\n四面 border: Npx dashed/dotted/none = ${allSideOther.length} 处`);
for (const s of allSideOther) console.log(`  L${s.line}  ${s.w}px ${s.style}  ${s.text.slice(0, 70)}`);

console.log('\noutline 1px：');
lines.forEach((l, i) => { if (/outline\s*:\s*1px/.test(l)) console.log(`  L${i + 1}  ${rawLines[i].trim().slice(0, 80)}`); });
