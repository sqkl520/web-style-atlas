// 汇总报告要用的表格数据（只读）。
import { readFileSync, writeFileSync } from 'node:fs';

const load = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const B = load('prototypes/_selection/data.js');
const byId = Object.fromEntries(B.map((r) => [r.id, r]));
const after = JSON.parse(readFileSync('deliverables/65-exec/audit-after.json', 'utf8'));
const accept = JSON.parse(readFileSync('deliverables/65-exec/accept-audit.json', 'utf8'));
const expanded = JSON.parse(readFileSync('deliverables/65-exec/audit-expanded.json', 'utf8'));
const iso = JSON.parse(readFileSync('deliverables/65-exec/audit-isolate.json', 'utf8'));

const CASES = after.viewports[0].cases;
let famOk = 0;
for (const c of CASES) if (c.familyField === byId[c.id].family) famOk++;
console.log('详情「美学家族与参考」与 data.js 逐字相同:', famOk + '/30');

console.log('\n| 案 | summary | 展开字数 | 折叠块高 | 面板净增 | 展开净增 |');
console.log('|---|---|---|---|---|---|');
for (const c of CASES) {
  const acc = accept.items.desktop.find((x) => x.id === c.id);
  const exp = expanded.find((x) => x.vp === 'desktop' && x.id === c.id);
  const is = iso.cases.find((x) => x.vp === 'desktop' && x.id === c.id);
  console.log(`| ${c.id} | ${acc.closed.summary} | ${exp.len} | ${is.foldH} | +${is.delta} | +${exp.delta} |`);
}

const dl = CASES.map((c) => c.familyField.length);
console.log('\nfamily 全长 min/p50/max:', Math.min(...dl), dl.slice().sort((a, b) => a - b)[15], Math.max(...dl));
console.log('family 全长合计:', dl.reduce((a, b) => a + b, 0));

// 改前行卡显示字数（复算）
let before = 0;
for (const r of B) before += (r.family || '').split('。')[0].split('：').pop().slice(0, 34).length;
console.log('改前行卡合计显示:', before, '字；改后（CSS 两行，1440 实测可见）合计:', 3931, '字');

// 配色行改前改后（抽 3 案）
const pal = iso.cases.filter((x) => x.vp === 'desktop' && ['S01', 'S15', 'S07'].includes(x.id));
console.log('\n配色行对比:');
for (const p of pal) console.log(`  ${p.id}\n    改前 ${p.paletteBefore}\n    改后 ${p.paletteAfter}\n    行高 ${p.paletteH_before} → ${p.paletteH_after}`);

writeFileSync('deliverables/65-exec/report-tables.json', JSON.stringify({
  famOk, cases: CASES.map((c) => ({ id: c.id, summary: accept.items.desktop.find((x) => x.id === c.id).closed.summary })),
  pal, familyLen: { min: Math.min(...dl), p50: dl.slice().sort((a, b) => a - b)[15], max: Math.max(...dl), total: dl.reduce((a, b) => a + b, 0) },
}, null, 2));
