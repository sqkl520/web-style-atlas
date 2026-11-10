// 只读探针：从四案 report.json 取 mono / empty-screens 的机械读数
import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style/prototypes';
const CASES = ['S07-slate-ink-contents', 'S08-amber-overprint-lightbox', 'S13-blind-debossed-dispatch', 'S21-interlocking-release-book'];
for (const c of CASES) {
  const j = JSON.parse(readFileSync(`${ROOT}/${c}/.inspect/report.json`, 'utf8'));
  const v = j.viewports.find((x) => x.width === 1440);
  const t = v.metrics.type;
  console.log(`\n=== ${c}`);
  console.log(`  page: ${v.metrics.page.screens} screens · height ${v.metrics.page.height}px · viewport height ${v.height}px`);
  console.log(`  filled per screen: ${JSON.stringify(v.filled)}`);
  console.log(`  monoProseShare=${t.monoProseShare}  monoShare=${t.monoShare}`);
  console.log(`  monoFamilies=${JSON.stringify(t.monoFamilies)}`);
  console.log(`  families=${JSON.stringify(t.families)}`);
  console.log(`  sizes=${JSON.stringify(t.sizes)}  body=${JSON.stringify(t.body)}`);
}
