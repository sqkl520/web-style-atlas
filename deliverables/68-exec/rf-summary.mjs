// 汇总 rf-verify.json：五档排序 × 首屏完整卡 + 基线偏差表
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const j = JSON.parse(readFileSync(join(HERE, 'rf-verify.json'), 'utf8'));

const SORTS = ['n', 'fr', 'thr', 'gate', 'built'];
for (const w of [1440, 768, 390]) {
  console.log(`\n=== ${w} ===`);
  for (const key of ['asis16', 'forced13']) {
    const r = j.runs[`${w}|${key}`];
    if (!r) continue;
    console.log(` ${key.padEnd(9)} body=${r.gate.bodySize}px lh=${r.gate.leading} hair=${r.gate.hairlines} sizes=[${r.gate.sizes}] measure=${r.gate.measureChars}`);
    const line = SORTS.map((s) => {
      const x = r.sorts[s];
      return `${s}:${x.firstId} top=${x.firstTop} h=${x.firstH} full=${x.complete}`;
    }).join('  ');
    console.log('   ' + line);
    console.log(`   mast=${r.base.mastH} h1=${r.base.h1Size}/${r.base.h1H} rail=${r.base.railH} det=${r.detail?.scrollH} ovf(closed)=${r.base.overflowX} ovf(detailOpen)=${r.overflowDetailOpen} tiny<13=${r.tiny.count} famClip=${r.base.famClamp} truncated=${r.base.famTruncated}`);
    console.log(`   findings: ${r.gate.findings.map((f) => f.level + ':' + f.id).join(', ') || 'clean'}`);
  }
}

// 基线核对（任务书给的数值）
const BASE = {
  1440: { firstTop: 407, firstH: 277, h1: 74, rail: 900, detMin: 2301, detMax: 2690 },
  390: { firstTop: 402, firstH: 390, detMin: 2301, detMax: 2690 },
};
console.log('\n=== 任务书基线核对（现状 asis16） ===');
for (const [w, b] of Object.entries(BASE)) {
  const r = j.runs[`${w}|asis16`];
  const n = r.sorts.n;
  const chk = (name, got, want, tol) => {
    const ok = tol == null ? got === want : Math.abs(got - want) <= tol;
    console.log(`  ${ok ? 'PASS' : 'DIFF'} ${w} ${name}: got=${got} want=${want}${tol ? ` ±${tol}` : ''}`);
  };
  chk('首卡top', n.firstTop, b.firstTop, 6);
  chk('首卡高', n.firstH, b.firstH, 8);
  if (b.h1) chk('h1', r.base.h1Size, b.h1, 0);
  if (b.rail) chk('rail', r.base.railH, b.rail, 1);
  const d = r.detail?.scrollH;
  console.log(`  ${d >= b.detMin && d <= b.detMax ? 'PASS' : 'DIFF'} ${w} 详情scrollH: ${d} (期望 ${b.detMin}–${b.detMax})`);
  console.log(`  ${r.base.overflowX === 0 ? 'PASS' : 'DIFF'} ${w} 横向溢出: ${r.base.overflowX}`);
  console.log(`  ${r.tiny.count === 0 ? 'PASS' : 'DIFF'} ${w} <13px声明数: ${r.tiny.count}`);
  const allFull = SORTS.every((s) => r.sorts[s].complete >= 1);
  console.log(`  ${allFull ? 'PASS' : 'DIFF'} ${w} 五档排序首屏完整卡均≥1: ${SORTS.map((s) => r.sorts[s].complete).join('/')}`);
}
