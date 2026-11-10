// 任务 1 探针 I：严格口径 + 五案逐字前后对照。
// 严格口径：把「只在 @media 里成立」的值视为**不可用于全站陈述**，
// 于是「文案里出现 mq 值」也算编造（因为提示词没说"窄屏才这样"）。
import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'D:/Web/style/deliverables/69-audit';
const sim = JSON.parse(readFileSync(OUT + '/t1-final-sim.json', 'utf8'));
const T = JSON.parse(readFileSync(OUT + '/t1-truth.json', 'utf8'));

// 从 t1-truth.json 重建 base/mq 划分（与 t1-final-sim 的 analyze() 同源，这里只做统计）
const rows = sim.rows;
const txt = [];
const p = (s) => { txt.push(s); console.log(s); };

p('=== 严格口径：现行提示词 vs 桌面真相 ===');
p('（"编造" = 文案里的 px 在桌面原型里不存在；"漏讲" = 桌面真相没被文案覆盖）');
let nPhantom = 0, nOmit = 0, nExact = 0;
for (const r of rows) {
  const ph = r.now.phantom, om = r.now.omitted;
  if (ph.length) nPhantom++;
  if (om.length) nOmit++;
  if (!ph.length && !om.length && !r.now.tailBad) nExact++;
}
p('  有编造值的案：' + nPhantom + '/30');
p('  有漏讲值的案：' + nOmit + '/30');
p('  完全正确的案：' + nExact + '/30');
p('');

p('=== 五案：现行 vs (e) 逐字对照 ===');
const cases = T;
for (const id of ['S09', 'S10', 'S15', 'S25', 'S27']) {
  const r = rows.find((x) => x.id === id);
  p('');
  p('──── ' + id + ' ────');
  p('  现行：');
  p('    ' + r.now.text);
  p('    → 编造=[' + r.now.phantom.join(',') + '] 漏讲=[' + r.now.omitted.join(',') + '] 话术自洽=' + !r.now.tailBad);
  p('  (e) 修法后：');
  for (const ln of r.e.text.split('\n')) p('    ' + ln);
  p('    → 编造=[' + r.e.phantom.join(',') + '] 漏讲=[' + r.e.omitted.join(',') + '] 话术自洽=' + !r.e.tailBad);
}

p('');
p('=== (e) 修法后 30 案的全部文案（供逐条核对）===');
for (const r of rows) {
  p('');
  p(r.id + ':');
  for (const ln of r.e.text.split('\n')) p('  ' + ln);
}
writeFileSync(OUT + '/t1-before-after.txt', txt.join('\n'), 'utf8');
p('');
p('wrote t1-before-after.txt');
