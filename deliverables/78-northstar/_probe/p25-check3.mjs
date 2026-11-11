// 探针 25：核对推荐的 3 案（S08 S15 S31）逐维度真实覆盖
import { readFileSync } from 'node:fs';

const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/78-northstar/_probe/rows.json', 'utf8'));
const byId = Object.fromEntries(rows.map(r => [r.id, r]));
const DIMS = ['tone', 'structure', 'band', 'ground', 'loud', 'load', 'threshold', 'minPics', 'degrades'];
const domains = {};
for (const k of DIMS) domains[k] = [...new Set(rows.map(r => String(r[k])))];

const RISK = r => {
  const a = [];
  if (r.chroma <= 25) a.push('quiet');
  if (r.hard) a.push('hard');
  if (r.gateFail > 0) a.push('gateFail');
  if (r.minPics <= 1) a.push('fewpics');
  if (r.q2new) a.push('q2new');
  return a;
};

for (const sel of [['S08', 'S15', 'S31'], ['S08', 'S24', 'S31'], ['S15', 'S24', 'S31']]) {
  console.log(`\n===== ${sel.join(' ')} =====`);
  for (const k of DIMS) {
    const hit = new Set(sel.map(id => String(byId[id][k])));
    console.log(`  ${k.padEnd(10)} ${hit.size}/${domains[k].length}  [${[...hit].join(', ')}]`);
  }
  const risks = [...new Set(sel.flatMap(id => RISK(byId[id])))];
  console.log(`  风险类       ${risks.length}/5  [${risks.join(', ')}]`);
}
