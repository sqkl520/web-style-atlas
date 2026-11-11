// 探针 24：加"未盲测"维度后的最优方案（增量计分，快）
import { readFileSync, readdirSync } from 'node:fs';

const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/78-northstar/_probe/rows.json', 'utf8'));
const ids = rows.map(r => r.id);
const byId = Object.fromEntries(rows.map(r => [r.id, r]));
const tested = new Set(readdirSync('D:/Web/style/deliverables/74-q7')
  .filter(f => /^out-S\d\d.*\.html$/.test(f)).map(f => f.slice(4, 7)));
for (const r of rows) r.blindTested = tested.has(r.id);

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
const LISTS = rows.map(r => atoms(r).map(t => ai.get(t)));
const freq = new Array(ATOMS.length).fill(0);
for (const l of LISTS) for (const i of l) freq[i]++;
const W = freq.map(f => 1 / f);

const cnt = new Int32Array(ATOMS.length);
let cur = 0;
const add = l => { let d = 0; for (const i of l) if (cnt[i]++ === 0) d += W[i]; return d; };
const del = l => { let d = 0; for (const i of l) if (--cnt[i] === 0) d -= W[i]; return d; };
const covCount = () => { let c = 0; for (let i = 0; i < ATOMS.length; i++) if (cnt[i] > 0) c++; return c; };
const covList = () => ATOMS.filter((_, i) => cnt[i] > 0);

function best(k, ok) {
  let B = { s: -1, idx: [] };
  const ch = [];
  cnt.fill(0); cur = 0;
  const rec = (st) => {
    if (ch.length === k) { if (ok(ch)) { if (cur > B.s + 1e-12) B = { s: cur, idx: [...ch] }; } return; }
    if (35 - st < k - ch.length) return;
    for (let i = st; i < 35; i++) {
      ch.push(i); const d = add(LISTS[i]); cur += d;
      rec(i + 1);
      cur -= d; del(LISTS[i]); ch.pop();
    }
  };
  rec(0);
  return B;
}
function show(label, B) {
  const sel = B.idx.map(i => ids[i]);
  cnt.fill(0); let s = 0;
  for (const i of B.idx) s += add(LISTS[i]);
  const cov = covList();
  console.log(`\n=== ${label}：${sel.join(' ')} ===`);
  console.log(`覆盖 ${cov.length}/${ATOMS.length}｜得分 ${s.toFixed(3)}｜未盲测案 ${sel.filter(id => !byId[id].blindTested).length}/8`);
  console.log('未覆盖:', ATOMS.filter(t => !cov.includes(t)).join(', ') || '(全覆)');
  for (const id of sel) {
    const r = byId[id];
    console.log(`  ${id} ${r.cn} | ${r.tone} | ${r.structure} | ${r.band} | ${r.loud} | chroma=${r.chroma} | minPics=${r.minPics} | degr=${r.degrades} | hard=${r.hard} | q2=${r.q2new} | 盲测=${r.blindTested}`);
  }
  cnt.fill(0);
}

show('规划 8 案', { idx: ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'].map(id => ids.indexOf(id)) });
show('最优 8 案（不限）', best(8, () => true));
show('最优 8 案（≥6 案未盲测）', best(8, ch => ch.filter(i => !byId[ids[i]].blindTested).length >= 6));
show('最优 3 案（不限）', best(3, () => true));
show('最优 3 案（全为未盲测）', best(3, ch => ch.every(i => !byId[ids[i]].blindTested)));
