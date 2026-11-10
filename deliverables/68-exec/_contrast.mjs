// 对比度与历史计数复核（WCAG 相对亮度）。
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const hex2rgb = (h) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = (h) => { const [r, g, b] = hex2rgb(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const cr = (a, b) => { const l1 = L(a), l2 = L(b); const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]; return +((hi + 0.05) / (lo + 0.05)).toFixed(2); };

const pairs = [
  ['#56534b', '#e7e7e2', '现行 --ink-3 on --ground'],
  ['#56534b', '#f2f2ee', '现行 --ink-3 on --card'],
  ['#6f6c64', '#e7e7e2', '旧 --ink-3(#6f6c64) on --ground'],
  ['#6f6c64', '#f2f2ee', '旧 --ink-3 on --card'],
  ['#43413b', '#e7e7e2', '--ink-2 on --ground'],
  ['#1c1b18', '#e7e7e2', '--ink on --ground'],
  ['#7a5a00', '#fdf6e3', 'cap-warn 文字 on 底'],
  ['#c9c7bf', '#1c1b18', 'wz pressed span on ink'],
  ['#b8860b', '#f2f2ee', 'wz-gate 左边框 on card'],
];
for (const [a, b, note] of pairs) console.log(`${a} on ${b} = ${cr(a, b)}:1   ${note}`);

// 历史：首个提交里 11/12px 出现次数
function countPx(rev, file) {
  let src;
  try { src = execFileSync('git', ['show', `${rev}:${file}`], { encoding: 'utf8', maxBuffer: 1 << 26 }); } catch (e) { return `ERR ${e.message.slice(0, 80)}`; }
  const strip = src.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const n11 = (strip.match(/font-size\s*:\s*11px/g) || []).length;
  const n12 = (strip.match(/font-size\s*:\s*12px/g) || []).length;
  const total = (strip.match(/font-size\s*:\s*(1[0-2])px/g) || []).length;
  return { n11, n12, total };
}
const first = execFileSync('git', ['rev-list', '--max-parents=0', 'HEAD'], { encoding: 'utf8' }).trim().split(/\r?\n/)[0];
console.log('\n首个提交 =', first);
console.log('  首个提交 style.css 11/12px:', JSON.stringify(countPx(first, 'prototypes/_selection/style.css')));
console.log('  HEAD style.css 11/12px  :', JSON.stringify(countPx('HEAD', 'prototypes/_selection/style.css')));

// 旧 report.json 的 body size（已入库那一份，2026-10-21）
const old = JSON.parse(readFileSync('prototypes/_selection/.inspect/report.json', 'utf8'));
console.log('\n入库 report.json at =', old.at);
for (const v of old.viewports) console.log(`  ${v.width}: body=${v.metrics.type.body.size}px sizes=${v.metrics.type.sizes.join('/')} hairlines=${v.metrics.surfaces.hairlines} hero=${v.metrics.hero.size}px`);
console.log('  findings =', old.findings.map((f) => `${f.level}:${f.id}`).join(' '));

// 新 report（本轮 inspect-before）
const now = JSON.parse(readFileSync('deliverables/68-exec/inspect-before/report.json', 'utf8'));
console.log('\n本轮 inspect at =', now.at);
for (const v of now.viewports) console.log(`  ${v.width}: body=${v.metrics.type.body.size}px sizes=${v.metrics.type.sizes.join('/')} hairlines=${v.metrics.surfaces.hairlines} samples=${JSON.stringify(v.metrics.surfaces.hairlineSamples)}`);
console.log('  findings =', now.findings.map((f) => `${f.level}:${f.id}@${f.width}`).join(' '));
