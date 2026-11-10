#!/usr/bin/env node
// 63-test · step 12: emit the final per-case metric rows used verbatim in the report,
// so no number in the write-up is hand-transcribed.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DATA = resolve('D:/Web/style/deliverables/63-test/data');
const d = JSON.parse(readFileSync(join(DATA, 'verdict-data.json'), 'utf8'));
const css = JSON.parse(readFileSync(join(DATA, 'font-coverage.json'), 'utf8'));

const NAMES = {
  'S03-long-exposure-observatory': 'S03 长曝光观测站',
  'S05-pixel-cold-storage-console': 'S05 像素冷库台',
  'S10-grid-versus-sheet': 'S10 栅格对开张',
  'S14-zero-g-launch-sequence': 'S14 零重力发射序',
  'S15-fishery-floor-ledger': 'S15 渔场平面簿',
  'S18-phosphor-service-deck': 'S18 磷光检修台',
  'S20-plotter-soundfield': 'S20 针笔声场图',
  'S21-interlocking-release-book': 'S21 联锁释放簿',
  'S29-wire-bound-safety-manual': 'S29 钢丝安全册',
};

const lines = [];
const table = [];
for (const [c, s] of Object.entries(d)) {
  const per = s.per.swap;
  const doc = per.map((p) => `${p.w}:${p.docH[0]}→${p.docH[1]}(${p.docPct >= 0 ? '+' : ''}${p.docPct}%)`);
  const rows = per.map((p) => `@${p.w}  docH ${p.docH[0]}→${p.docH[1]} (${p.docPct >= 0 ? '+' : ''}${p.docPct}%) · 横溢 ${p.hOv[0]}→${p.hOv[1]} · 文字溢出 ${p.textOv[0]}→${p.textOv[1]} · 重叠 ${p.ovl[0]}→${p.ovl[1]} · 空白洞 ${p.holes[0]}→${p.holes[1]}px · 关键元素最大位移 ${p.maxShift}px`);
  // identical keys
  const ident = per.every((p) => p.keys.every((k) => !k.missing && Math.abs(k.dTop) < 0.5 && Math.abs(k.dW) < 0.5 && Math.abs(k.dH) < 0.5));
  const driftSels = [...new Set(per.flatMap((p) => p.keys.filter((k) => k.missing || Math.abs(k.dTop) >= 0.5 || Math.abs(k.dH) >= 0.5 || Math.abs(k.dW) >= 0.5).map((k) => k.sel)))];
  const badMetrics = per.some((p) => p.textOv[1] > 0 || p.hOv[1] > 0 || Math.abs(p.ovl[1] - p.ovl[0]) > 1 || Math.abs(p.holes[1] - p.holes[0]) > 40);
  const fontMiss = css[c] ? css[c].fams.filter((f) => f.missingCount > 0).map((f) => `${f.ff}(${f.missingCount}/73)`) : [];
  lines.push(`\n### ${c}`);
  lines.push(`- 三视口: ${rows.join('\n  ')}`);
  lines.push(`- 关键元素全部逐像素相同: ${ident ? 'YES' : 'NO — 漂移: ' + driftSels.join(', ')}`);
  lines.push(`- 指标越界(溢出/重叠/空洞): ${badMetrics ? 'YES' : 'NO'}`);
  lines.push(`- 对照: swap=${s.swap.docPct}%  swap-cjk=${s.cjk.docPct}%  swap-inset=${s.inset ? s.inset.docPct : 'n/a'}%`);
  lines.push(`- 字体子集缺字: ${fontMiss.length ? fontMiss.join(', ') : '无'}`);
  table.push({ c, name: NAMES[c], doc, ident, badMetrics, fontMiss: fontMiss.join(' '), swapPct: s.swap.docPct, cjkPct: s.cjk.docPct, insetPct: s.inset ? s.inset.docPct : 0, shift: s.swap.shift, ovl: s.swap.ovlDelta, textOv: s.swap.textOv, hOv: s.swap.hOv });
}
writeFileSync(join(DATA, 'final-rows.md'), lines.join('\n'));
writeFileSync(join(DATA, 'final-rows.json'), JSON.stringify(table, null, 1));
console.log(lines.join('\n'));
