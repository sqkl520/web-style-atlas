// 只读探针：30 案 monoShare / monoProseShare 全景 + 规格里"等宽"的声明分布
import { readFileSync, readdirSync } from 'node:fs';
const ROOT = 'D:/Web/style/prototypes';
const dirs = readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();
console.log('id   monoShare  monoProseShare  monoFamilies');
let prose = 0, anyMono = 0;
for (const d of dirs) {
  const j = JSON.parse(readFileSync(`${ROOT}/${d}/.inspect/report.json`, 'utf8'));
  const v = j.viewports.find((x) => x.width === 1440);
  const t = v.metrics.type;
  if (t.monoShare > 0) anyMono++;
  if (t.monoProseShare > 0) prose++;
  console.log(`${d.slice(0, 3)}   ${String(t.monoShare).padEnd(10)} ${String(t.monoProseShare).padEnd(15)} ${JSON.stringify(t.monoFamilies)}`);
}
console.log(`\n30 案里用到等宽的 ${anyMono} 案；等宽落在 code 之外（monoProseShare>0）的 ${prose} 案`);

// 规格字段 4 里提到等宽的案数
const specs = readdirSync(`${ROOT}/_specs`).filter((f) => /^S\d{2}\.md$/.test(f)).sort();
const hits = [];
for (const f of specs) {
  const t = readFileSync(`${ROOT}/_specs/${f}`, 'utf8');
  const m = t.match(/\*\*4\. 字体策略\*\*[^\n]*/);
  if (m && /等宽|Mono|mono/.test(m[0])) hits.push(f.slice(0, 3));
}
console.log(`规格字段 4 明文写等宽字族的：${hits.length} 案 → ${hits.join(' ')}`);
