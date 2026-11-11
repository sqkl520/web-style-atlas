// 探针 23：含"未盲测"维度重算 —— 盲测验货的价值在于测没测过的
import { readFileSync, readdirSync } from 'node:fs';

const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/78-northstar/_probe/rows.json', 'utf8'));
const ids = rows.map(r => r.id);
const byId = Object.fromEntries(rows.map(r => [r.id, r]));
const tested = new Set(readdirSync('D:/Web/style/deliverables/74-q7')
  .filter(f => /^out-S\d\d.*\.html$/.test(f)).map(f => f.slice(4, 7)));
for (const r of rows) r.blindTested = tested.has(r.id);

console.log('未盲测过的案（26 案）:', rows.filter(r => !r.blindTested).map(r => r.id).join(' '));
console.log('\n已盲测（9 案）:', [...tested].sort().join(' '));

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
  if (!r.blindTested) a.push('untested');
  return [...new Set(a)];
}
const ATOMS = [...new Set(rows.flatMap(atoms))].sort();
const ai = new Map(ATOMS.map((t, i) => [t, i]));
const LIST = new Map(rows.map(r => [r.id, atoms(r).map(t => ai.get(t))]));
const freq = new Array(ATOMS.length).fill(0);
for (const [, l] of LIST) for (const i of l) freq[i]++;
const W = freq.map(f => 1 / f);

const score = sel => {
  const c = new Set();
  for (const id of sel) for (const i of LIST.get(id)) c.add(i);
  let s = 0; for (const i of c) s += W[i];
  return { s, cov: [...c] };
};

const S8 = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];
const p = score(S8);
console.log(`\n规划 8 案：覆盖 ${p.cov.length}/${ATOMS.length}，得分 ${p.s.toFixed(3)}`);
console.log('  其中 untested 原子被覆盖 =', p.cov.includes(ai.get('untested')));

const missing = ATOMS.filter((t, i) => !p.cov.includes(i));
console.log('  未覆盖:', missing.join(', '));

// 加 untested 维度后的最优 8 案（强制至少 6 案未盲测）
function best(k, ok) {
  let B = { s: -1, ids: [] };
  const rec = (st, ch) => {
    if (ch.length === k) { if (ok(ch)) { const { s } = score(ch); if (s > B.s + 1e-12) B = { s, ids: [...ch] }; } return; }
    for (let i = st; i < 35; i++) { ch.push(ids[i]); rec(i + 1, ch); ch.pop(); }
  };
  rec(0, []);
  return B;
}
for (const [label, ok] of [
  ['最优 8 案（不限）', () => true],
  ['最优 8 案（≥6 案未盲测）', ch => ch.filter(id => !byId[id].blindTested).length >= 6],
]) {
  const b = best(8, ok);
  const { s, cov } = score(b.ids);
  console.log(`\n${label}: ${b.ids.join(' ')}`);
  console.log(`  覆盖 ${cov.length}/${ATOMS.length}，得分 ${s.toFixed(3)}（规划=${p.s.toFixed(3)}）`);
  console.log(`  未盲测案数 = ${b.ids.filter(id => !byId[id].blindTested).length}/8`);
  console.log(`  未覆盖: ${ATOMS.filter((t, i) => !cov.includes(i)).join(', ')}`);
}

// 3 案：强制至少 2 案未盲测
const b3 = best(3, ch => ch.filter(id => !byId[id].blindTested).length >= 2);
console.log(`\n最优 3 案（≥2 案未盲测）: ${b3.ids.join(' ')}`);
const s3 = score(b3.ids);
console.log(`  覆盖 ${s3.cov.length}/${ATOMS.length}`);
for (const id of b3.ids) {
  const r = byId[id];
  console.log(`  ${id} ${r.cn} | ${r.tone} | ${r.structure} | ${r.band} | ${r.loud} | chroma=${r.chroma} | minPics=${r.minPics} | degr=${r.degrades} | hard=${r.hard} | q2=${r.q2new} | 盲测=${r.blindTested}`);
}
