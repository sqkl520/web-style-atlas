// 探针 17：3 案候选逐维度覆盖对照（S08 S15 S32 vs S08 S24 S31 vs 规划前 3 案含义）
import { readFileSync } from 'node:fs';

const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/78-northstar/_probe/rows.json', 'utf8'));
const byId = Object.fromEntries(rows.map(r => [r.id, r]));
const DIMS = ['tone', 'structure', 'band', 'ground', 'loud', 'load', 'threshold', 'minPics', 'degrades'];
const RISK = r => {
  const a = [];
  if (r.chroma <= 25) a.push('quiet');
  if (r.hard) a.push('hard');
  if (r.gateFail > 0) a.push('gateFail');
  if (r.minPics <= 1) a.push('fewpics');
  if (r.q2new) a.push('q2new');
  return a;
};

const cands = {
  'A: S08 S15 S32': ['S08', 'S15', 'S32'],
  'B: S08 S24 S31': ['S08', 'S24', 'S31'],
  'C: S15 S24 S31（纯稀有度）': ['S15', 'S24', 'S31'],
};

// 每维度的全库值域
const domains = {};
for (const k of DIMS) domains[k] = [...new Set(rows.map(r => String(r[k])))];

for (const [label, sel] of Object.entries(cands)) {
  console.log(`\n===== ${label} =====`);
  let totHit = 0, totAll = 0;
  for (const k of DIMS) {
    const hit = new Set(sel.map(id => String(byId[id][k])));
    totHit += hit.size; totAll += domains[k].length;
    console.log(`  ${k.padEnd(10)} ${hit.size}/${domains[k].length}  [${[...hit].join(', ')}]`);
  }
  const risks = [...new Set(sel.flatMap(id => RISK(byId[id])))];
  console.log(`  风险类       ${risks.length}/5  [${risks.join(', ')}]`);
  console.log(`  维度值合计   ${totHit}/${totAll} = ${(totHit / totAll * 100).toFixed(1)}%`);
  console.log('  逐案:');
  for (const id of sel) {
    const r = byId[id];
    console.log(`    ${id} ${r.cn} | ${r.tone} | ${r.structure} | ${r.band} | ${r.ground} | ${r.loud} | ${r.load} | ${r.threshold} | minPics=${r.minPics} | degr=${r.degrades} | chroma=${r.chroma} | pics=${r.realPictures} | fail=${r.gateFail} | hard=${r.hard} | q2=${r.q2new}`);
  }
}

// minPics>=6 全 8 案的超几何
const C = (a, b) => { if (b < 0 || b > a) return 0; let r = 1; for (let i = 0; i < b; i++) r = r * (a - i) / (i + 1); return r; };
const K = rows.filter(r => r.minPics >= 6).length;
console.log(`\nminPics>=6 全库 ${K}/35；8 案全是 minPics>=6 的概率 = C(${K},8)/C(35,8) = ${(C(K, 8) / C(35, 8) * 100).toFixed(3)}%`);
console.log(`minPics<=5 全库 ${35 - K}/35；8 案一个都没有的概率 = C(${35 - K},8)/C(35,8) = ${(C(35 - K, 8) / C(35, 8) * 100).toFixed(3)}%`);
const Q = rows.filter(r => r.chroma <= 25).length;
console.log(`chroma<=25 全库 ${Q}/35；8 案全避开的概率 = ${(C(35 - Q, 8) / C(35, 8) * 100).toFixed(3)}%`);
