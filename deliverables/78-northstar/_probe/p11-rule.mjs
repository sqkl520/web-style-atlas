// 探针 11（v2）：我的抽样规则 —— 加权集合覆盖，原子用位掩码，穷举 C(35,k) 全部最优
// 判据完全可机器执行：给定 35 案数据 + 下列 ATOMS 定义，输出确定的案号（无随机、无人工判断）。
import { readFileSync } from 'node:fs';

const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/78-northstar/_probe/rows.json', 'utf8'));
const byId = Object.fromEntries(rows.map(r => [r.id, r]));
const ids = rows.map(r => r.id);

// ── 原子定义：一个原子 = 一个"会改变提示词文本 / 已证明会出缺陷 / 验证最少"的可观测特征 ──
function atoms(r) {
  const a = [
    'tone:' + r.tone,
    'struct:' + r.structure,
    'band:' + r.band,
    'ground:' + r.ground,
    'loud:' + r.loud,
    'load:' + r.load,
    'thr:' + r.threshold,
    // minPics 是 buildPrompt 的真实分岔点（prompt-copy.js:826），按功能分档
    'pics:' + (r.minPics <= 1 ? '0-1' : r.minPics <= 5 ? '2-5' : r.minPics <= 7 ? '6-7' : '8+'),
    // degrades 是 buildPrompt 的真实分岔点（prompt-copy.js:813），两句话方向相反
    'degr:' + r.degrades,
  ];
  if (r.chroma <= 25) a.push('risk:quiet');     // 非常安静，6 案
  if (r.hard) a.push('risk:hard');              // prompts.hardIds，4 案
  if (r.gateFail > 0) a.push('risk:gateFail');  // 闸门红，5 案
  if (r.minPics <= 1) a.push('risk:fewpics');   // 少图，4 案
  if (r.q2new) a.push('risk:q2new');            // Q2 新建，5 案
  return [...new Set(a)];
}

const ATOMS = [...new Set(rows.flatMap(atoms))].sort();
const ai = new Map(ATOMS.map((t, i) => [t, i]));
const mask = new Map(rows.map(r => {
  let m = 0n;
  for (const t of atoms(r)) m |= (1n << BigInt(ai.get(t)));
  return [r.id, m];
}));

// 原子频次 → 权重 w = 1/频次（稀有特征更值钱）
const freq = new Map(ATOMS.map(t => [t, 0]));
const AIDX = ATOMS.map((t, i) => i);
const MASKBITS = new Map(); // id -> [原子下标...]
for (const r of rows) {
  const list = [];
  for (const t of atoms(r)) { const i = ai.get(t); list.push(i); freq.set(t, freq.get(t) + 1); }
  MASKBITS.set(r.id, list);
}
const W = ATOMS.map(t => 1 / freq.get(t));

// 增量计分：covCnt[i] = 第 i 个原子被几个选中案覆盖；只在 0→1 时加权重
const covCnt = new Int32Array(ATOMS.length);
function addCase(list) { let d = 0; for (const i of list) { if (covCnt[i]++ === 0) d += W[i]; } return d; }
function delCase(list) { let d = 0; for (const i of list) { if (--covCnt[i] === 0) d -= W[i]; } return d; }

const LISTS = ids.map(id => MASKBITS.get(id));
const fullMask = () => { let m = 0n; for (let i = 0; i < ATOMS.length; i++) if (covCnt[i] > 0) m |= (1n << BigInt(i)); return m; };

const SAMPLE8 = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];

const popcount = m => { let c = 0; while (m) { m &= m - 1n; c++; } return c; };

function bestK(k) {
  const n = ids.length;
  let best = { s: -1, idx: [] };
  const chosen = [];
  covCnt.fill(0);
  let cur = 0;
  const rec = (start) => {
    if (chosen.length === k) {
      if (cur > best.s + 1e-12) best = { s: cur, idx: [...chosen] };
      return;
    }
    if (n - start < k - chosen.length) return;
    for (let i = start; i < n; i++) {
      chosen.push(i);
      const d = addCase(LISTS[i]);
      cur += d;
      rec(i + 1);
      cur -= d;
      delCase(LISTS[i]);
      chosen.pop();
    }
  };
  rec(0);
  return best;
}

function report(label, idxs) {
  covCnt.fill(0);
  let s = 0;
  for (const i of idxs) s += addCase(LISTS[i]);
  const m = fullMask();
  const cov = popcount(m);
  const missing = ATOMS.filter((t, i) => !(m & (1n << BigInt(i))));
  console.log(`\n=== ${label} ===`);
  console.log(`案号: ${idxs.map(i => ids[i]).join(' ')}`);
  console.log(`覆盖原子 ${cov}/${ATOMS.length}，加权得分 ${s.toFixed(3)}`);
  console.log(`未覆盖 (${missing.length}): ${missing.join(', ') || '(无，全覆盖)'}`);
  covCnt.fill(0);
  return { missing, s };
}

const plannerIdx = SAMPLE8.map(id => ids.indexOf(id));
const p = report(`规划 8 案`, plannerIdx);
for (const id of SAMPLE8) {
  const r = byId[id];
  console.log(`  ${id} ${r.cn.padEnd(8,'　')} | ${r.tone} | ${r.structure.padEnd(12)} | ${r.band} | chroma=${String(r.chroma).padStart(3)} | minPics=${String(r.minPics).padStart(2)} | degr=${r.degrades} | hard=${r.hard} | fail=${r.gateFail} | pics=${r.realPictures} | q2=${r.q2new}`);
}

const b8 = bestK(8);
report(`我的规则 最优 8 案`, b8.idx);
for (const i of b8.idx) {
  const r = byId[ids[i]];
  console.log(`  ${r.id} ${r.cn.padEnd(8,'　')} | ${r.tone} | ${r.structure.padEnd(12)} | ${r.band} | chroma=${String(r.chroma).padStart(3)} | minPics=${String(r.minPics).padStart(2)} | degr=${r.degrades} | hard=${r.hard} | fail=${r.gateFail} | pics=${r.realPictures} | q2=${r.q2new}`);
}

const b3 = bestK(3);
report(`我的规则 最优 3 案（最小可行）`, b3.idx);
for (const i of b3.idx) {
  const r = byId[ids[i]];
  console.log(`  ${r.id} ${r.cn.padEnd(8,'　')} | ${r.tone} | ${r.structure.padEnd(12)} | ${r.band} | chroma=${String(r.chroma).padStart(3)} | minPics=${String(r.minPics).padStart(2)} | degr=${r.degrades} | hard=${r.hard} | fail=${r.gateFail} | pics=${r.realPictures} | q2=${r.q2new}`);
}

// 单案信息密度排名
const dens = ids.map((id, i) => ({
  id,
  d: (() => { covCnt.fill(0); const s = addCase(LISTS[i]); covCnt.fill(0); return s; })(),
})).sort((a, b) => b.d - a.d);
console.log('\n=== 单案信息密度前 12 ===');
console.log(dens.slice(0, 12).map(x => `${x.id}:${x.d.toFixed(2)}`).join('  '));
const rank = Object.fromEntries(dens.map((x, i) => [x.id, i + 1]));
console.log('规划 8 案密度位次:', SAMPLE8.map(id => `${id}#${rank[id]}`).join(' '));

// 偏斜度量 TVD
console.log('\n=== 逐维度 TVD（全库 vs 规划 8 案；0=分布一致，1=完全不同）===');
const tvdOf = (k, sample) => {
  const all = {}, sm = {};
  for (const r of rows) all[String(r[k])] = (all[String(r[k])] || 0) + 1;
  for (const id of sample) { const v = String(byId[id][k]); sm[v] = (sm[v] || 0) + 1; }
  const keys = new Set([...Object.keys(all), ...Object.keys(sm)]);
  let t = 0;
  for (const key of keys) t += Math.abs((all[key] || 0) / 35 - (sm[key] || 0) / sample.length);
  return t / 2;
};
const mine8 = b8.idx.map(i => ids[i]);
const mine3 = b3.idx.map(i => ids[i]);
console.log('维度        规划8案   我的8案   我的3案');
for (const k of ['tone', 'structure', 'band', 'ground', 'loud', 'load', 'threshold', 'minPics', 'degrades']) {
  console.log(`${k.padEnd(10)} ${tvdOf(k, SAMPLE8).toFixed(3).padStart(7)} ${tvdOf(k, mine8).toFixed(3).padStart(9)} ${tvdOf(k, mine3).toFixed(3).padStart(9)}`);
}
