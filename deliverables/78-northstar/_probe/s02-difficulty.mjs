#!/usr/bin/env node
/* s02 —— 难点五类：成员、重叠、并集；上一轮 8 案的命中数与精确超几何概率。
 *
 * 概率一律用 BigInt 精确有理数算，不做蒙特卡洛。公式：
 *   P(X = k) = C(K,k)·C(N-K,n-k) / C(N,n)
 * 其中 N=35 总案数，K=某类（或并集）的案数，n=抽样数。
 *
 * 读 s01-dataset.json（由 s01 生成），不重复读源文件。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const rows = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s01-dataset.json'), 'utf8'));
const N = rows.length;

/* ===== 精确组合数 / 有理数概率 ===== */
const C = (n, k) => {
  if (k < 0 || k > n) return 0n;
  let r = 1n;
  for (let i = 0; i < k; i++) r = (r * BigInt(n - i)) / BigInt(i + 1);
  return r;
};
const TOTAL = C(N, 8); // 分母在下面按 n 重算

/* 有理数用小函数：num/den，均为 BigInt，输出保留 6 位小数与分数 */
function pStr(num, den) {
  const scaled = Number((num * 100000000n) / den) / 1e8;
  return scaled;
}
const fmtPct = (x) => (x * 100).toFixed(4) + '%';
const fmtPct2 = (x) => (x * 100).toFixed(2) + '%';

/* ===== 五类难点定义（全部可由字段直接判定，无人工裁量） ===== */
const CLASSES = [
  { key: 'A', name: 'chroma ≤ 25（很安静）', test: (r) => r.chroma <= 25 },
  { key: 'B', name: 'hard（提示词侧认知门槛）', test: (r) => r.hard === true },
  { key: 'C', name: 'minPics ≤ 1（少图）', test: (r) => r.minPics <= 1 },
  { key: 'D', name: 'Q2 新建（S31–S35）', test: (r) => Number(r.id.slice(1)) >= 31 },
  { key: 'E', name: 'gate.fail > 0（闸门有红）', test: (r) => r.gateFail > 0 },
];
for (const c of CLASSES) c.members = rows.filter(c.test).map((r) => r.id);

const union = [...new Set(CLASSES.flatMap((c) => c.members))].sort();
const K = union.length;

console.log('s02 —— 难点五类');
console.log('='.repeat(78));
for (const c of CLASSES) {
  console.log(`\n${c.key}. ${c.name}`);
  console.log(`   案数 K=${c.members.length}  (${((c.members.length / N) * 100).toFixed(1)}% of ${N})`);
  console.log(`   成员: ${c.members.join(' ')}`);
}

console.log(`\n## 并集（五类至少命中一类）：K=${K} / ${N} = ${((K / N) * 100).toFixed(1)}%`);
console.log(`   ${union.join(' ')}`);
console.log(`   非难点案（五类全漏）：${N - K} 案`);
console.log(`   ${rows.map((r) => r.id).filter((id) => !union.includes(id)).join(' ')}`);

console.log('\n## 每案的命中类别（含重叠结构）');
const hitRows = rows
  .map((r) => ({ r, hits: CLASSES.filter((c) => c.test(r)).map((c) => c.key) }))
  .filter((x) => x.hits.length > 0)
  .sort((a, b) => b.hits.length - a.hits.length || a.r.id.localeCompare(b.r.id));
for (const { r, hits } of hitRows) {
  console.log(`   ${r.id}  ${hits.length} 类  [${hits.join('')}]   chroma=${String(r.chroma).padStart(3)} hard=${r.hard ? 'Y' : '.'} minPics=${r.minPics} Q2=${Number(r.id.slice(1)) >= 31 ? 'Y' : '.'} fail=${r.gateFail}`);
}
console.log(`\n   并集内 5 类全中 ${hitRows.filter((x) => x.hits.length === 5).length} 案；4 类 ${hitRows.filter((x) => x.hits.length === 4).length} 案；` +
  `3 类 ${hitRows.filter((x) => x.hits.length === 3).length} 案；2 类 ${hitRows.filter((x) => x.hits.length === 2).length} 案；1 类 ${hitRows.filter((x) => x.hits.length === 1).length} 案`);

/* 五类的两两重叠矩阵 */
console.log('\n## 五类两两重叠（交集案数）');
console.log('        ' + CLASSES.map((c) => c.key.padStart(4)).join(''));
for (const a of CLASSES) {
  const line = CLASSES.map((b) => String(a.members.filter((id) => b.members.includes(id)).length).padStart(4)).join('');
  console.log(`   ${a.key}    ${line}`);
}

/* ===== 上一轮 8 案 ===== */
const PREV = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];
console.log('\n## 上一轮 8 案（S09/S28/S03/S07/S14/S19/S26/S24）');
const prevRows = PREV.map((id) => rows.find((r) => r.id === id));
for (const r of prevRows) {
  const hits = CLASSES.filter((c) => c.test(r)).map((c) => c.key);
  console.log(`   ${r.id}  chroma=${String(r.chroma).padStart(3)}  hard=${r.hard ? 'Y' : '.'}  minPics=${r.minPics}  Q2=${Number(r.id.slice(1)) >= 31 ? 'Y' : '.'}  fail=${r.gateFail}  → 命中 ${hits.length} 类 ${hits.length ? '[' + hits.join('') + ']' : ''}`);
}
const prevHitCount = prevRows.filter((r) => CLASSES.some((c) => c.test(r))).length;
console.log(`\n   命中数：${prevHitCount} / 8 案；被命中的类别：${[...new Set(prevRows.flatMap((r) => CLASSES.filter((c) => c.test(r)).map((c) => c.key)))].join('') || '（无）'}`);
console.log(`   8 案 chroma: ${prevRows.map((r) => r.chroma).join(' ')}  最小 ${Math.min(...prevRows.map((r) => r.chroma))}`);
console.log(`   8 案 minPics: ${prevRows.map((r) => r.minPics).join(' ')}  最小 ${Math.min(...prevRows.map((r) => r.minPics))}`);
console.log(`   8 案 structure: ${prevRows.map((r) => r.structure).join(' ')}  （去重 ${new Set(prevRows.map((r) => r.structure)).size} 个）`);
console.log(`   8 案 tone 去重: ${new Set(prevRows.map((r) => r.tone)).size} / 7  →  未覆盖: ${[...new Set(rows.map((r) => r.tone))].filter((t) => !prevRows.some((r) => r.tone === t)).join(' / ')}`);
console.log(`   8 案全在 S01–S30：${prevRows.every((r) => Number(r.id.slice(1)) < 31)}`);

/* ===== 精确超几何 ===== */
console.log('\n## 精确超几何：随机抽 8 案，命中 0 个难点案的概率');
console.log('   P(X = k) = C(K,k)·C(N-K,n-k) / C(N,n)   N=35, n=8');
function hyperAtMost0(KK, n, NN = N) {
  const den = C(NN, n);
  const num = C(NN - KK, n); // k=0
  return { num, den, p: pStr(num, den) };
}
const den8 = C(N, 8);
const pZeroUnion = hyperAtMost0(K, 8);
console.log(`   并集 K=${K}: P(命中 0 个) = C(${N - K},8)/C(${N},8) = ${pZeroUnion.num}/${pZeroUnion.den} = ${fmtPct(pZeroUnion.p)} = 1 / ${(1 / pZeroUnion.p).toFixed(1)}`);
for (const c of CLASSES) {
  const q = hyperAtMost0(c.members.length, 8);
  console.log(`   ${c.key} 单独看 K=${String(c.members.length).padStart(2)}: P(全漏) = ${fmtPct(q.p).padStart(10)}  （单侧 p 值）`);
}
console.log(`   随机 8 案里难点案的期望个数 E[X] = 8·${K}/35 = ${((8 * K) / N).toFixed(3)}；上一轮实际 0`);

/* 命中 k 个的完整分布，便于看观测值有多极端 */
function hyperPmf(KK, n, NN = N) {
  const den = C(NN, n);
  const out = [];
  for (let k = 0; k <= Math.min(KK, n); k++) out.push({ k, p: pStr(C(KK, k) * C(NN - KK, n - k), den) });
  return out;
}
console.log('\n   X（8 案中难点案个数）的完整分布：');
const pmf = hyperPmf(K, 8);
for (const { k, p } of pmf) console.log(`     k=${k}  ${fmtPct(p).padStart(11)}  ${'█'.repeat(Math.round(p * 100))}`);
console.log(`   P(X ≤ 0) = ${fmtPct(pmf[0].p)}；P(X ≥ 1) = ${fmtPct(1 - pmf[0].p)}`);

/* 覆盖全部五类的概率（容斥） */
console.log('\n## 随机 8 案「五类全部至少命中一次」的概率（容斥原理）');
const masks = CLASSES.map((c) => c.members);
let coverAll = 0;
for (let S = 0; S < 1 << CLASSES.length; S++) {
  const idx = [...Array(CLASSES.length).keys()].filter((i) => S & (1 << i));
  const uni = new Set(idx.flatMap((i) => masks[i]));
  const sign = idx.length % 2 === 0 ? 1 : -1;
  // P(选中的 8 案避开 uni) = C(N-|uni|,8)/C(N,8)
  coverAll += sign * pStr(C(N - uni.size, 8), den8);
}
console.log(`   P(五类全覆盖) = ${fmtPct(coverAll)}`);
console.log(`   P(至少漏一类) = ${fmtPct(1 - coverAll)}`);

/* ===== 另一个独立证据：上一轮 8 案与 74-q7 已复刻池的重叠 ===== */
console.log('\n## 另一条独立证据：这 8 案是从「已复刻过的池子」里挑的吗');
const Q7 = ['S03', 'S06', 'S07', 'S14', 'S17', 'S19', 'S23', 'S24', 'S26']; // deliverables/74-q7/out-Sxx.html
const ov = PREV.filter((id) => Q7.includes(id));
console.log(`   deliverables/74-q7 已有 out-Sxx.html 的案（9 个）: ${Q7.join(' ')}`);
console.log(`   上一轮 8 案与之重叠 ${ov.length} / 8: ${ov.join(' ')}；新引入 ${PREV.filter((id) => !Q7.includes(id)).join(' ')}`);
let pGe6 = 0;
for (let k = 6; k <= 8; k++) pGe6 += pStr(C(Q7.length, k) * C(N - Q7.length, 8 - k), den8);
console.log(`   P(随机 8 案与固定 9 案池重叠 ≥6) = Σ_{k=6..8} C(9,k)C(26,8-k)/C(35,8) = ${fmtPct(pGe6)} = 1 / ${(1 / pGe6).toFixed(0)}`);
const expOv = (8 * Q7.length) / N;
console.log(`   随机 8 案与该池的期望重叠 = 8·9/35 = ${expOv.toFixed(2)}；实际 ${ov.length}，是期望的 ${(ov.length / expOv).toFixed(2)} 倍`);

writeFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s02-classes.json'), JSON.stringify({
  classes: CLASSES.map((c) => ({ key: c.key, name: c.name, members: c.members })),
  union, K, prev: PREV, prevHitCount,
  pZeroUnion: pZeroUnion.p, pCoverAll: coverAll, pGe6Reuse: pGe6,
}, null, 1));
console.log('\n→ s02-classes.json 已写');
