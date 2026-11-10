// 只读探针：dump 四个不达标案的完整 FAIL message（含 viewport 宽度、fix 原文）
import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style/prototypes';
const CASES = ['S07-slate-ink-contents', 'S08-amber-overprint-lightbox', 'S13-blind-debossed-dispatch', 'S21-interlocking-release-book'];
for (const c of CASES) {
  const j = JSON.parse(readFileSync(`${ROOT}/${c}/.inspect/report.json`, 'utf8'));
  console.log(`\n=== ${c}  at=${j.at}  allow=${JSON.stringify(j.allow)}  findings=${j.findings.length}`);
  for (const f of j.findings) {
    console.log(` [${f.level}] ${f.id} @${f.width}px`);
    console.log(`   message: ${f.message}`);
    console.log(`   fix: ${f.fix}`);
  }
}
