// 报告里所有 file:line 断言的自检：把每条引用读出来，确认行号上真的有那段声明。
import { readFileSync } from 'node:fs';
const CLAIMS = [
  ['prototypes/S01-red-wedge-broadsheet/style.css', 195, 'grid-template-columns'],
  ['prototypes/S01-red-wedge-broadsheet/style.css', 26, '--bar'],
  ['prototypes/S07-slate-ink-contents/style.css', 74, 'grid-template-columns'],
  ['prototypes/S07-slate-ink-contents/style.css', 81, 'column-count'],
  ['prototypes/S07-slate-ink-contents/style.css', 82, 'column-count'],
  ['prototypes/S17-revenue-stamp-stub/style.css', 134, 'grid-template-columns'],
  ['prototypes/S33-teal-mirror-ledger/style.css', 103, '.rows'],
  ['prototypes/S33-teal-mirror-ledger/style.css', 112, 'grid-template-columns'],
  ['prototypes/S09-batik-price-board/style.css', 276, 'column-count'],
  ['prototypes/S28-jazz-intaglio-wall/style.css', 369, 'grid-template-columns'],
  ['prototypes/S10-grid-versus-sheet/style.css', 151, '6fr 7fr 9fr 8fr 5fr'],
  ['prototypes/S11-samizdat-typewriter/style.css', 282, 'repeat(12'],
  ['prototypes/S13-blind-debossed-dispatch/style.css', 184, 'repeat(16'],
  ['prototypes/S13-blind-debossed-dispatch/style.css', 705, 'repeat(12'],
  ['prototypes/S15-fishery-floor-ledger/style.css', 155, 'repeat(12'],
  ['prototypes/S19-copperplate-herbarium-cabinet/style.css', 278, 'repeat(12'],
  ['prototypes/S20-plotter-soundfield/style.css', 162, '324px'],
  ['prototypes/S21-interlocking-release-book/style.css', 300, 'repeat(3'],
  ['prototypes/S22-paper-screen-folded-sheet/style.css', 243, 'fold-track'],
  ['prototypes/S24-cyanotype-rainforest-path/style.css', 130, 'repeat(8'],
  ['prototypes/S27-hand-painted-bill-dispatch/style.css', 90, 'repeat(9'],
  ['prototypes/S23-exposed-plaster-chronology-wall/style.css', 151, 'repeat(36'],
  ['prototypes/S08-amber-overprint-lightbox/style.css', 241, 'auto-fit'],
  ['prototypes/S12-lime-knockout-wall/style.css', 197, 'repeat(8'],
  ['prototypes/S12-lime-knockout-wall/style.css', 358, 'auto-fit'],
  ['prototypes/S03-long-exposure-observatory/style.css', 222, 'chrono'],
  ['prototypes/_build/vendor/probe.mjs', 108, '承载正文的容器'],
  ['prototypes/_build/vendor/probe.mjs', 191, '单栏也是一种栏数'],
];
let bad = 0;
for (const [f, line, needle] of CLAIMS) {
  const txt = readFileSync(f, 'utf8').split('\n');
  const got = txt[line - 1] || '';
  const ok = got.includes(needle);
  if (!ok) { bad++; console.log(`✗ ${f}:${line}  期望含「${needle}」  实际：${got.trim().slice(0, 80)}`); }
  else console.log(`✓ ${f}:${line}`);
}
console.log(bad ? `\n${bad} 条断言不成立` : '\n全部 file:line 断言成立');
