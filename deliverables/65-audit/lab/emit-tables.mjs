// Emit the comparison tables used in the report, straight from the measured JSON.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const LAB = resolve('deliverables/65-audit/lab');
const v = JSON.parse(readFileSync(join(LAB, 'variants.json'), 'utf8'));
const rec = JSON.parse(readFileSync(join(LAB, 'recommended.json'), 'utf8'));
const reach = JSON.parse(readFileSync(join(LAB, 'reachability.json'), 'utf8'));

const ORDER = ['base', 'jia', 'yi', 'bing', 'ding', 'wu', 'ji', 'geng', 'xin', 'ren'];
const NAMES = Object.fromEntries(v.variants.map((x) => [x.id, x.name]));
const get = (id, label, scheme = 'S15') => v.runs.find((r) => r.variant === id && r.label === label && r.scheme === scheme);

const lines = [];
lines.push('## A. 桌面 1440×900 / S15');
lines.push('| 方案 | contentH | 屏数 | 首屏完整字段 | 首屏部分字段 | 折叠组 | 到最后字段需滚(屏次) | 全展开后 contentH |');
lines.push('|---|---|---|---|---|---|---|---|');
for (const id of ORDER) {
  const r = get(id, 'desktop');
  if (!r) continue;
  lines.push(`| ${id} ${NAMES[id] || ''} | ${r.panel.contentH} | ${r.scroll.screens} | ${r.totals.fullInFirstScreen} | ${r.totals.partialInFirstScreen} | ${r.variantExtra.collapsedCount} | ${r.scroll.stepsToLastField} | ${r.variantExtra.panelHeightAllOpen} |`);
}
lines.push('');
lines.push('## B. 移动 390×844 / S15');
lines.push('| 方案 | contentH | 屏数 | 首屏完整字段 | 首屏部分字段 | 到最后字段需滚(屏次) | 横向溢出 |');
lines.push('|---|---|---|---|---|---|---|');
for (const id of ORDER) {
  const r = get(id, 'mobile');
  if (!r) continue;
  lines.push(`| ${id} ${NAMES[id] || ''} | ${r.panel.contentH} | ${r.scroll.screens} | ${r.totals.fullInFirstScreen} | ${r.totals.partialInFirstScreen} | ${r.scroll.stepsToLastField} | ${r.panel.docOverflowX} |`);
}
lines.push('');
lines.push('## C. 桌面 S08（次长案）');
lines.push('| 方案 | contentH | 屏数 | 首屏完整字段 | 到最后字段需滚 |');
lines.push('|---|---|---|---|---|');
for (const id of ORDER) {
  const r = get(id, 'desktop', 'S08');
  if (!r) continue;
  lines.push(`| ${id} | ${r.panel.contentH} | ${r.scroll.screens} | ${r.totals.fullInFirstScreen} | ${r.scroll.stepsToLastField} |`);
}
lines.push('');
lines.push('## D. 基线字段表（现状, 1440×900, S15）');
const base = get('base', 'desktop');
lines.push('| # | 字段 | 起始 top | 高度 | 字数 | 首屏可见比例 |');
lines.push('|---|---|---|---|---|---|');
for (const f of base.fields) {
  lines.push(`| ${f.i + 1} | ${f.label} | ${f.top} | ${f.height} | ${f.chars} | ${f.visibility} |`);
}
lines.push('');
lines.push('## E. 基线字段表（现状, 390×844, S15）');
const basem = get('base', 'mobile');
lines.push('| # | 字段 | 起始 top | 高度 | 字数 |');
lines.push('|---|---|---|---|---|');
for (const f of basem.fields) {
  lines.push(`| ${f.i + 1} | ${f.label} | ${f.top} | ${f.height} | ${f.chars} |`);
}
lines.push('');
lines.push('## F. 推荐方案壬 分项位置（首屏 0–900 / 头部以下 88.4–900）');
for (const key of ['desktop-S15', 'desktop-S08', 'desktop-S29', 'mobile-S15', 'mobile-S08', 'mobile-S29']) {
  const r = rec[key];
  if (!r) continue;
  lines.push(`### ${key}  contentH=${r.contentH} (${r.screens} 屏) 首屏字数=${r.firstScreenChars} 头部=${r.headH} 可用=${r.usable}`);
  lines.push('| 块 | top | bottom | 首屏 |');
  lines.push('|---|---|---|---|');
  for (const it of r.items) lines.push(`| ${it.kind} · ${it.name} | ${it.top} | ${it.bottom} | ${it.fullyVisible ? '完整' : it.visible ? '截断' : '—'} |`);
  lines.push('');
}
lines.push('## G. 可检索性 / 可达性（折叠是否让人找不到）');
for (const k of Object.keys(reach)) {
  const r = reach[k];
  lines.push(`- **${k}**: 文本索引命中 ${JSON.stringify(r.findIndex)}；无障碍树命中 ${JSON.stringify(r.axHits)}`);
}
lines.push('');
lines.push('## H. 折叠组标题与内容（推荐方案）');
for (const r of v.runs.filter((x) => x.variant === 'ren' && x.label === 'desktop')) {
  lines.push(`- ${r.scheme}: 折叠字段 = ${JSON.stringify(r.variantExtra.foldedFieldNames.flat())}`);
}

const text = lines.join('\n');
writeFileSync(join(LAB, 'tables.md'), text);
console.log(text);
