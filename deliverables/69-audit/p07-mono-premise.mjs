// 只读探针：核对 CONTRACT §9.15「mono 在本语料上必然触发」是否成立
// 依据：30 案 report.json 的 monoProseShare + index.html 里 <code>/<pre> 的实际用量
import { readFileSync, readdirSync } from 'node:fs';
const ROOT = 'D:/Web/style/prototypes';
const dirs = readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();
const rows = [];
for (const d of dirs) {
  const j = JSON.parse(readFileSync(`${ROOT}/${d}/.inspect/report.json`, 'utf8'));
  const v = j.viewports.find((x) => x.width === 1440);
  const html = readFileSync(`${ROOT}/${d}/index.html`, 'utf8');
  const codeOpen = (html.match(/<code[\s>]/g) || []).length;
  const preOpen = (html.match(/<pre[\s>]/g) || []).length;
  rows.push({ id: d.slice(0, 3), monoShare: v.metrics.type.monoShare, prose: v.metrics.type.monoProseShare, code: codeOpen, pre: preOpen });
}
const clean = rows.filter((r) => r.prose === 0 && r.monoShare > 0);
const bad = rows.filter((r) => r.prose > 0);
console.log('用等宽但 monoProseShare = 0（即等宽全部落在 code/pre 内）的案：');
for (const r of clean) console.log(`  ${r.id}  monoShare ${r.monoShare}  <code> ${r.code}  <pre> ${r.pre}`);
console.log(`\n合计 ${clean.length} 案`);
console.log('\nmonoProseShare > 0（等宽漏到 code 之外）的案：');
for (const r of bad) console.log(`  ${r.id}  monoProseShare ${r.prose}  <code> ${r.code}  <pre> ${r.pre}`);
console.log(`\n未用等宽的案：${rows.filter((r) => r.monoShare === 0).map((r) => r.id).join(' ') || '无'}`);
