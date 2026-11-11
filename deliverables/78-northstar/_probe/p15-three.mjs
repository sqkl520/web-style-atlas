// 探针 15：3 案最小方案 —— 两个目标对比（纯稀有度 vs 稀有度+主流必占一席）
import { readFileSync } from 'node:fs';

const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/78-northstar/_probe/rows.json', 'utf8'));
const ids = rows.map(r => r.id);
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

function atoms(r) {
  const a = ['tone:' + r.tone, 'struct:' + r.structure, 'band:' + r.band, 'ground:' + r.ground,
    'loud:' + r.loud, 'load:' + r.load, 'thr:' + r.threshold,
    'pics:' + (r.minPics <= 1 ? '0-1' : r.minPics <= 5 ? '2-5' : r.minPics <= 7 ? '6-7' : '8+'),
    'degr:' + r.degrades];
  if (r.chroma <= 25) a.push('risk:quiet');
  if (r.hard) a.push('risk:hard');
  if (r.gateFail > 0) a.push('risk:gateFail');
  if (r.minPics <= 1) a.push('risk:fewpics');
  if (r.q2new) a.push('risk:q2new');
  return [...new Set(a)];
}
const ATOMS = [...new Set(rows.flatMap(atoms))].sort();
const ai = new Map(ATOMS.map((t, i) => [t, i]));
const LIST = new Map(rows.map(r => [r.id, atoms(r).map(t => ai.get(t))]));
const freq = new Array(ATOMS.length).fill(0);
for (const [, l] of LIST) for (const i of l) freq[i]++;
const W = freq.map(f => 1 / f);
const RISK = ATOMS.map((t, i) => t.startsWith('risk:') ? i : -1).filter(i => i >= 0);
const riskIdxOf = id => LIST.get(id).filter(i => RISK.includes(i));

const score = (sel) => {
  const c = new Set();
  for (const id of sel) for (const i of LIST.get(id)) c.add(i);
  let s = 0; for (const i of c) s += W[i];
  return { s, cov: [...c] };
};

function best3(filterFn) {
  let best = { s: -1, ids: [] };
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) for (let c = b + 1; c < ids.length; c++) {
    const sel = [ids[a], ids[b], ids[c]];
    if (filterFn && !filterFn(sel)) continue;
    const { s } = score(sel);
    if (s > best.s + 1e-12) best = { s, ids: sel };
  }
  return best;
}

const show = (label, b) => {
  const { s, cov } = score(b.ids);
  console.log(`\n=== ${label}：${b.ids.join(' ')} ===`);
  console.log(`加权得分 ${s.toFixed(3)}｜覆盖原子 ${cov.length}/${ATOMS.length}`);
  const risks = new Set(b.ids.flatMap(riskIdxOf));
  console.log('命中的风险类:', [...risks].map(i => ATOMS[i]).join(' ') || '(无)');
  console.log('未覆盖的维度值（排除 struct 稀有标签）:',
    ATOMS.filter((t, i) => !cov.includes(i) && !t.startsWith('struct:')).join(', ') || '(无)');
  for (const id of b.ids) {
    const r = byId[id];
    console.log(`  ${id} ${r.cn} | ${r.tone} | ${r.structure} | ${r.band} | loud=${r.loud} | chroma=${r.chroma} | minPics=${r.minPics} | degr=${r.degrades} | hard=${r.hard} | q2=${r.q2new}`);
  }
};

show('A 纯稀有度最优 3 案', best3(null));
// 约束：至少一席是主流（loud=就要扎眼，占全库 19/35=54%）
show('B 稀有度 + 主流占一席（loud=就要扎眼）', best3(sel => sel.some(id => byId[id].loud === '就要扎眼')));
// 约束：全场主流覆盖（loud 两档都有）且至少 2 类风险
show('C 主流 loud 必占 + 至少 2 类风险原子', best3(sel => {
  const rs = new Set(sel.flatMap(riskIdxOf));
  return sel.some(id => byId[id].loud === '就要扎眼') && rs.size >= 2;
}));
