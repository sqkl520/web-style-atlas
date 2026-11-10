// 探针 12：三条硬核验
//  A. 面板深度的时间链：2991 → +landing → 3478 → +layout → 3969
//  B. audit 字段是否被 S13 的「3-附（反套路改造三指标）」污染
//  C. README 关于 S12/S15/S19「已知未修」是否已经过期
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROTO, loadData } from './_rt_lib.mjs';

const D = loadData();

console.log('═══ A. 面板深度因果链（用实测字段高 + 实测 contentH 复算）═══');
// baseline-stdout.json（65-audit 那一轮，WIP 修复之前）S15 contentH=3478，字段里没有「布局与网格」
const base = JSON.parse(readFileSync('D:/Web/style/deliverables/65-audit/lab/baseline-stdout.json', 'utf16le').replace(/^\uFEFF/, ''));
const b15 = base.panels.find((p) => p.id === 'S15' && p.label === 'desktop');
console.log('  baseline（65-audit 实测，WIP 之前）S15 contentH = ' + b15.contentH);
console.log('  baseline 的字段清单（' + b15.fields.length + ' 个）: ' + b15.fields.map((f) => f[1]).join(' / '));
console.log('  → 注意：baseline 字段里**没有「布局与网格」**（该案 layout 当时为空，field() 对空值返回空串）');

const now = JSON.parse(readFileSync('D:/Web/style/deliverables/65-plan/_rt_out/panel-measure.json', 'utf8'));
const n15 = now.rows.find((r) => r.id === 'S15');
const fLayout = n15.fields.find((f) => f.label === '布局与网格');
const fLanding = n15.fields.find((f) => f.label === '可落地要点');
console.log('  现在（本轮实测）S15 contentH = ' + n15.panel.contentH + '，字段 ' + n15.fields.length + ' 个');
console.log('  「布局与网格」字段高 = ' + fLayout.h + 'px（本轮 WIP 修复后才出现）');
console.log('  「可落地要点」字段高 = ' + fLanding.h + 'px（上一轮修复后才出现）');
console.log('');
console.log('  复算：3478 + ' + fLayout.h + ' = ' + (b15.contentH + fLayout.h) + '（实测 ' + n15.panel.contentH + '，差 ' + (n15.panel.contentH - b15.contentH - fLayout.h).toFixed(1) + 'px）');
console.log('  反推 2991（prompt-copy.js:510 记录的 2026-10-25 值）：');
console.log('    3478 − 2991 = ' + (b15.contentH - 2991) + 'px —— 正好是「可落地要点」字段高 ' + fLanding.h + 'px 加块间距');
console.log('  结论：2991 → +' + fLanding.h + '(landing) → ' + b15.contentH + ' → +' + fLayout.h + '(layout) → ' + n15.panel.contentH);
console.log('        面板每变深一次，都是「接通某个死字段」的直接结果。');

console.log('');
console.log('═══ B. audit 字段的纯度：S13 是否混入了「3-附（反套路改造三指标）」 ═══');
const lens = D.map((r) => ({ id: r.id, n: (r.audit || '').length }));
lens.sort((a, b) => b.n - a.n);
console.log('  按长度排序前 5：' + lens.slice(0, 5).map((x) => x.id + '=' + x.n).join(' ') + '｜中位 ' + lens.map((x) => x.n).sort((a, b) => a - b)[15]);
const s13 = D.find((r) => r.id === 'S13');
const a13 = s13.audit || '';
console.log('  S13 audit 长度 = ' + a13.length);
const marker = '反套路改造三指标';
const mi = a13.indexOf(marker);
console.log('  含「' + marker + '」= ' + (mi >= 0) + (mi >= 0 ? '（位于第 ' + mi + ' 字）' : ''));
if (mi >= 0) {
  console.log('  ↓ 分界线之前的正文（作者写的审美判据）：');
  console.log('    ' + a13.slice(0, mi).replace(/\s+/g, ' ').slice(-160));
  console.log('  ↓ 分界线之后的正文（是评审清单，不是审美判据）：');
  console.log('    ' + a13.slice(mi, mi + 300).replace(/\s+/g, ' '));
}
console.log('');
console.log('  其它案是否也含这个词：' + D.filter((r) => (r.audit || '').includes(marker)).map((r) => r.id).join(' ') || '无（只有 S13）');
console.log('  含「必须存在」「必须不存在」「必须可测量」的案：' + D.filter((r) => /必须存在|必须不存在|必须可测量/.test(r.audit || '')).map((r) => r.id).join(' ') || '无');

console.log('');
console.log('═══ C. README 关于 S12/S15/S19「已知未修」是否过期 ═══');
const rd = readFileSync('D:/Web/style/README.md', 'utf8').split(/\r?\n/);
rd.forEach((l, i) => {
  if (/抽少了段|已知未修/.test(l)) console.log('  README.md:' + (i + 1) + '  ' + l.replace(/\s+/g, ' '));
});
console.log('  但本轮 data.js 实测：');
for (const id of ['S12', 'S15', 'S19']) {
  const r = D.find((x) => x.id === id);
  console.log('    ' + id + ' layout.length = ' + (r.layout || '').length + (r.layout ? '  ← 已有值，README 的「已知未修」已过期' : '  ← 仍为空'));
}

console.log('');
console.log('═══ C2. data.js vs prompts.js 是否同步（工作区状态）═══');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
console.log('  data.js 有 audit 的案数：' + D.filter((r) => (r.audit || '').length).length + '/30');
const pj = readFileSync(join(PROTO, '_selection/prompts.js'), 'utf8');
console.log('  prompts.js 里 "audit" 出现次数：' + (pj.match(/audit/g) || []).length);
console.log('  → 同一工作区里，data.js 已加 audit、prompts.js 未加 ⇒ 两条链路当前不同步。');
