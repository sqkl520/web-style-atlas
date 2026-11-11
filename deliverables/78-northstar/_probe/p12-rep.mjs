// 探针 12（v2）：分布匹配型规则 —— 累加式 TVD（每个维度按案增量更新），穷举 C(35,k) 最小
import { readFileSync } from 'node:fs';

const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/78-northstar/_probe/rows.json', 'utf8'));
const ids = rows.map(r => r.id);
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

const st = new Map();
for (const r of rows) st.set(r.structure, (st.get(r.structure) || 0) + 1);
console.log('structure 标签去重后 =', st.size, '（任务书写 22）');
const sum = [...st.values()].reduce((a, b) => a + b, 0);
console.log('频次合计 =', sum, '| 出现3次:', [...st.entries()].filter(([, v]) => v === 3).length,
  '| 出现2次:', [...st.values()].filter(v => v === 2).length,
  '| 出现1次:', [...st.values()].filter(v => v === 1).length);

const DIMS = ['tone', 'band', 'ground', 'loud', 'load', 'threshold', 'minPics', 'degrades', 'structure'];
// 把每个维度编码成小整数，便于用数组计数
const ENC = {};
for (const k of DIMS) {
  const vals = [...new Set(rows.map(r => String(r[k])))];
  ENC[k] = { vals, idx: new Map(vals.map((v, i) => [v, i])), N: vals.length };
}
// 每案在各维度的编码
const CODE = {};
for (const r of rows) CODE[r.id] = DIMS.map(k => ENC[k].idx.get(String(r[k])));
// 全库分布 p_k[v]
const P = DIMS.map(k => {
  const a = new Array(ENC[k].N).fill(0);
  for (const r of rows) a[ENC[k].idx.get(String(r[k]))]++;
  return a.map(x => x / 35);
});

// 当前样本计数
const cnt = DIMS.map(k => new Array(ENC[k].N).fill(0));
let n = 0;
function tvdTotal() {
  if (n === 0) return DIMS.length;
  let tot = 0;
  for (let d = 0; d < DIMS.length; d++) {
    let s = 0;
    for (let v = 0; v < cnt[d].length; v++) s += Math.abs(P[d][v] - cnt[d][v] / n);
    tot += s / 2;
  }
  return tot / DIMS.length;
}

const SAMPLE8 = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];
function tvdOf(sel) {
  n = sel.length;
  for (let d = 0; d < DIMS.length; d++) cnt[d].fill(0);
  for (const id of sel) for (let d = 0; d < DIMS.length; d++) cnt[d][CODE[id][d]]++;
  const t = tvdTotal();
  n = 0; for (let d = 0; d < DIMS.length; d++) cnt[d].fill(0);
  return t;
}
console.log('\n规划 8 案 平均 TVD =', tvdOf(SAMPLE8).toFixed(4));

function bestRep(k) {
  let best = { t: 1e9, ids: [] };
  const chosen = [];
  n = 0; for (let d = 0; d < DIMS.length; d++) cnt[d].fill(0);
  const rec = (start) => {
    if (chosen.length === k) { const t = tvdTotal(); if (t < best.t) best = { t, ids: [...chosen] }; return; }
    for (let i = start; i < ids.length; i++) {
      const id = ids[i];
      chosen.push(id); n++;
      for (let d = 0; d < DIMS.length; d++) cnt[d][CODE[id][d]]++;
      rec(i + 1);
      for (let d = 0; d < DIMS.length; d++) cnt[d][CODE[id][d]]--;
      n--; chosen.pop();
    }
  };
  rec(0);
  n = 0; for (let d = 0; d < DIMS.length; d++) cnt[d].fill(0);
  return best;
}

for (const k of [8, 3]) {
  const b = bestRep(k);
  console.log(`分布匹配最优 ${k} 案: ${b.ids.join(' ')}  平均 TVD = ${b.t.toFixed(4)}`);
  for (const id of b.ids) {
    const r = byId[id];
    console.log(`  ${r.id} ${r.cn} | ${r.tone} | ${r.structure} | ${r.band} | chroma=${r.chroma} | minPics=${r.minPics} | degr=${r.degrades} | hard=${r.hard} | q2=${r.q2new}`);
  }
}
