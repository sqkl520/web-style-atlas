// 探针 16：3 案方案 —— 加"主流占比"约束（loud 三档各最多 1 案，且必须有 1 案 就要扎眼）
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

const score = (sel) => {
  const c = new Set();
  for (const id of sel) for (const i of LIST.get(id)) c.add(i);
  let s = 0; for (const i of c) s += W[i];
  return { s, cov: [...c] };
};

function best3(ok) {
  let best = { s: -1, ids: [] };
  for (let a = 0; a < 35; a++) for (let b = a + 1; b < 35; b++) for (let c = b + 1; c < 35; c++) {
    const sel = [ids[a], ids[b], ids[c]];
    if (!ok(sel)) continue;
    const { s } = score(sel);
    if (s > best.s + 1e-12) best = { s, ids: sel };
  }
  return best;
}

const loudCount = (sel, v) => sel.filter(id => byId[id].loud === v).length;
const riskSet = sel => new Set(sel.flatMap(id => LIST.get(id).filter(i => RISK.includes(i))));

const show = (label, b, note) => {
  const { s, cov } = score(b.ids);
  console.log(`\n=== ${label} ===\n案号: ${b.ids.join(' ')}`);
  console.log(note || '');
  console.log(`加权得分 ${s.toFixed(3)}｜覆盖原子 ${cov.length}/${ATOMS.length}`);
  console.log('命中风险类:', [...riskSet(b.ids)].map(i => ATOMS[i]).join(' '));
  console.log('漏掉的非结构维度:', ATOMS.filter((t, i) => !cov.includes(i) && !t.startsWith('struct:')).join(', ') || '(无)');
  for (const id of b.ids) {
    const r = byId[id];
    console.log(`  ${id} ${r.cn} | ${r.tone} | ${r.structure} | ${r.band} | loud=${r.loud} | chroma=${r.chroma} | minPics=${r.minPics} | degr=${r.degrades} | hard=${r.hard} | fail=${r.gateFail} | pics=${r.realPictures} | q2=${r.q2new}`);
  }
};

// 主流配比约束：loud 三档各最多 1 案，且必须有 1 案是最常见档（就得扎眼 19/35）
const core = sel => loudCount(sel, '就要扎眼') === 1 && loudCount(sel, '很安静') <= 1 && loudCount(sel, '有态度不吵') <= 1;
show('推荐 3 案（主流配比 + 稀有度最大）', best3(core), '约束：loud 三档各最多 1 案，且必含 1 案「就要扎眼」（全库 19/35）');

// 加一条：必含 1 个 Q2 新案（验证最少）
const withNew = sel => core(sel) && sel.some(id => byId[id].q2new);
show('推荐 3 案（再加：必含 Q2 新案）', best3(withNew), '');

// 加一条：必含 1 个 hard 案
show('备选：core + 必含 hard', best3(sel => core(sel) && sel.some(id => byId[id].hard)), '');
