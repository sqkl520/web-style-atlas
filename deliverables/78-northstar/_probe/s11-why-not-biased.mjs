#!/usr/bin/env node
/* s11 —— 「为什么我的方案不是偏差样本」的概率论证。
 *
 * 上一轮的问题是：作者可以宣称"我按多样性抽了 8 案"，而抽样过程不可复算。
 * 本方案的处理方式不是"更好地随机"，而是**取消随机**：目标事先写死，
 * 方案是 C(30,10) 上的穷举最优。下面给出四组数。
 *
 * 本文件第一版有一处算错：tone 分组尺寸按 35 案写，而宇宙是 30 案（少 5 个），
 * 合计写成了 31。蒙特卡洛交叉校验把它抓了出来（精确 23.43% vs 实测 20.26%）。
 * 现在尺寸由数据现算，且保留校验作为常驻断言 —— 算错就自己报错退出。
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const rows = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s01-dataset.json'), 'utf8'));
const audit = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s03-prompt-audit.json'), 'utf8'));
const BROKEN = new Set(audit.bad);
const clean = rows.filter((r) => !BROKEN.has(r.id));
const N = clean.length;
const n = 10;
const N_HARD = clean.filter((r) => ['S08', 'S15', 'S18', 'S21', 'S22', 'S29'].includes(r.id)).length;

const C = (n2, k) => { if (k < 0 || k > n2 || n2 < 0) return 0n; let r = 1n; for (let i = 0; i < k; i++) r = (r * BigInt(n2 - i)) / BigInt(i + 1); return r; };
const pStr = (num, den) => Number((num * 100000000n) / den) / 1e8;
const pct = (x) => (x * 100).toFixed(6) + '%';

console.log('s11 —— 为什么这套选样不是偏差样本');
console.log('='.repeat(78));
console.log(`宇宙 ${N} 案（剔除提示词坏掉的 ${[...BROKEN].join(' ')}），推荐方案 ${n} 案\n`);

/* ---- tone 分组：尺寸从数据现算，不手写 ---- */
const toneGroups = new Map();
for (const r of clean) toneGroups.set(r.tone, (toneGroups.get(r.tone) || 0) + 1);
const toneSizes = [...toneGroups.values()];
const toneNames = [...toneGroups.keys()];
console.log('## ① 声称「覆盖 7 个 tone」—— 这有多难');
console.log(`   tone 分组: ${toneNames.map((t, i) => `${t.split(' / ')[0]}=${toneSizes[i]}`).join('  ')}`);
console.log(`   合计 ${toneSizes.reduce((a, b) => a + b, 0)}（必须等于 ${N}）`);
if (toneSizes.reduce((a, b) => a + b, 0) !== N) { console.error('!! tone 分组合计与宇宙不符'); process.exit(1); }

const den10 = C(N, n);
let numCoverAllTone = 0n;
for (let mask = 0; mask < (1 << toneSizes.length); mask++) {
  let size = 0, bits = 0;
  for (let i = 0; i < toneSizes.length; i++) if (mask & (1 << i)) { size += toneSizes[i]; bits++; }
  numCoverAllTone += (bits % 2 === 0 ? 1n : -1n) * C(N - size, n);
}
const pTone = pStr(numCoverAllTone, den10);
console.log(`   P(随机 ${n} 案覆盖全部 ${toneSizes.length} 个 tone) = ${pct(pTone)}`);

/* 常驻校验：蒙特卡洛必须落在精确值附近（否则公式写错了） */
let hit = 0; const T = 300000;
for (let t = 0; t < T; t++) {
  const pool = [];
  for (let i = 0; i < toneSizes.length; i++) for (let j = 0; j < toneSizes[i]; j++) pool.push(i);
  for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
  if (new Set(pool.slice(0, n)).size === toneSizes.length) hit++;
}
const mc = hit / T;
console.log(`   蒙特卡洛校验 (${T} 次): ${(mc * 100).toFixed(2)}%`);
if (Math.abs(mc - pTone) > 0.01) { console.error(`!! 容斥 ${(pTone * 100).toFixed(2)}% 与蒙特卡洛 ${(mc * 100).toFixed(2)}% 相差 >1 个点，公式有错`); process.exit(1); }
console.log('   ✓ 容斥与蒙特卡洛一致（差 <1 个点）');

/* ---- tone 去重的期望值（不是覆盖概率，是期望个数） ---- */
let expDistinct = 0;
for (const s of toneSizes) expDistinct += 1 - pStr(C(N - s, n), den10);
console.log(`   E[随机 ${n} 案的 tone 去重数] = Σ(1 − C(${N}−size,${n})/C(${N},${n})) = ${expDistinct.toFixed(2)}`);

/* ---- 难点 6 案全中 ---- */
console.log(`\n## ② 声称「难点 ${N_HARD} 案全中」—— 这有多难`);
const pHard = pStr(C(N_HARD, N_HARD) * C(N - N_HARD, n - N_HARD), den10);
console.log(`   P(随机 ${n} 案包含全部 ${N_HARD} 个难点案) = C(${N_HARD},${N_HARD})·C(${N - N_HARD},${n - N_HARD})/C(${N},${n})`);
console.log(`       = ${C(N - N_HARD, n - N_HARD)}/${den10} = ${pct(pHard)} = 1 / ${(1 / pHard).toFixed(0)}`);
console.log(`   E[随机 ${n} 案的难点案数] = ${n}·${N_HARD}/${N} = ${(n * N_HARD / N).toFixed(2)}`);

/* ---- 联合：tone 全覆盖 且 难点全中 ---- */
console.log('\n## ③ 两个条件同时成立的概率（这才是"我的方案"的概率）');
const HARD = ['S08', 'S15', 'S18', 'S21', 'S22', 'S29'];
const hardRows = clean.filter((r) => HARD.includes(r.id));
const hardToneTally = new Map();
for (const r of hardRows) hardToneTally.set(r.tone, (hardToneTally.get(r.tone) || 0) + 1);
console.log(`   难点案的 tone 归属: ${[...hardToneTally.entries()].map(([t, c]) => `${t.split(' / ')[0]}×${c}`).join(' ')}`);
const avail = toneSizes.slice();
for (const [t, c] of hardToneTally) avail[toneNames.indexOf(t)] -= c;
const needTones = toneNames.map((t, i) => (avail[i] > 0 && !hardToneTally.has(t) ? i : -1)).filter((i) => i >= 0);
console.log(`   难点案已覆盖的 tone: ${[...hardToneTally.keys()].map((t) => t.split(' / ')[0]).join(' / ')}`);
console.log(`   还需补的 tone: ${needTones.map((i) => toneNames[i].split(' / ')[0]).join(' / ')}（共 ${needTones.length} 个）`);
console.log(`   剩余可选: ${avail.map((v, i) => `${toneNames[i].split(' / ')[0]}=${v}`).join(' ')}  合计 ${avail.reduce((a, b) => a + b, 0)}`);
if (avail.reduce((a, b) => a + b, 0) !== N - N_HARD) { console.error('!! 剩余案数与 N-K 不符'); process.exit(1); }

const slots = n - N_HARD;   // 剩余可填的位置数
let memo = new Map();
const go = (t, rem, mask) => {
  if (rem === 0) {
    for (const i of needTones) if (!(mask & (1 << i))) return 0n;
    return 1n;
  }
  if (t >= toneSizes.length) return 0n;
  const key = `${t}|${rem}|${mask}`;
  if (memo.has(key)) return memo.get(key);
  let s = 0n;
  const lim = Math.min(avail[t], rem);
  for (let take = 0; take <= lim; take++) s += C(avail[t], take) * go(t + 1, rem - take, take > 0 ? (mask | (1 << t)) : mask);
  memo.set(key, s);
  return s;
};
const good = go(0, slots, 0);
const allSlots = C(N - N_HARD, slots);
console.log(`   在剩余 ${N - N_HARD} 案里填 ${slots} 个位置、且把缺的 tone 补齐的抽法: ${good} / ${allSlots}`);
const pJoint = pStr(good, den10);
console.log(`   P(随机 ${n} 案同时满足 tone 全覆盖与难点全中) = ${good}/${den10} = ${pct(pJoint)} = 1 / ${(1 / pJoint).toFixed(0)}`);

/* ---- structure 去重的期望 ---- */
console.log('\n## ④ 顺手：structure 去重的随机期望（回答"10 个标签算多吗"）');
const stGroups = new Map();
for (const r of clean) stGroups.set(r.structure, (stGroups.get(r.structure) || 0) + 1);
const stSizes = [...stGroups.values()];
console.log(`   ${clean.length} 案分布在 ${stGroups.size} 个标签，尺寸分布: ${[...new Set(stSizes)].sort().map((v) => `${v}案×${stSizes.filter((x) => x === v).length}个标签`).join(' ')}`);
let expSt = 0;
for (const s of stSizes) expSt += 1 - pStr(C(N - s, n), den10);
console.log(`   E[随机 ${n} 案的 structure 去重数] = ${expSt.toFixed(2)}；我的方案 = 10（并列中取到的最大值）`);

/* ---- 复刻过 ---- */
console.log('\n## ⑤ 信息增益：10 案里 0 案是复刻过的');
const REPL = ['S03', 'S06', 'S07', 'S14', 'S17', 'S19', 'S23', 'S24', 'S26'];
const pRepl0 = pStr(C(REPL.length, 0) * C(N - REPL.length, n), den10);
console.log(`   P(随机 ${n} 案完全避开 74-q7 已复刻的 9 案) = C(21,${n})/C(${N},${n}) = ${pct(pRepl0)}`);
console.log(`   E[随机 ${n} 案里复刻过的案数] = ${n}·9/${N} = ${(n * 9 / N).toFixed(2)}`);

/* ---- 汇总 ---- */
console.log('\n## ⑥ 汇总：随机抽 vs 我的方案');
console.log('   指标                     随机 10 案（期望或概率）      我的方案');
console.log('   ' + '-'.repeat(68));
console.log(`   tone 去重                ${expDistinct.toFixed(2)}                       7/7`);
console.log(`   tone 全覆盖概率           ${(pTone * 100).toFixed(2)}%                    100%（按构造）`);
console.log(`   难点案数                 ${(n * N_HARD / N).toFixed(2)}                       6/6`);
console.log(`   难点全中概率             ${(pHard * 100).toFixed(4)}%                 100%（按构造）`);
console.log(`   structure 去重           ${expSt.toFixed(2)}                       10/22`);
console.log(`   已复刻过的案             ${(n * 9 / N).toFixed(2)}                       0/10`);
console.log(`   同时满足 tone 全覆 + 难点全中   ${(pJoint * 100).toFixed(5)}%             100%（按构造）`);

console.log('\n## ⑦ 这套论证能证明什么、不能证明什么');
console.log('   能：方案不是随机抽的；它在我声明的那几条目标上取到上界；复算会得到同一组解。');
console.log('   不能：证明这几条目标是"对"的目标。若 owner 认为 structure 覆盖优先于难点覆盖，');
console.log('         那么 k=2 的那组解（29/29 层、8/8 未测、tone 7/7，但只 2 个难点案）才是最优。');
console.log('         两组解都写在报告里，取舍交给 owner。');
console.log('   也不能：证明覆盖了这些维度就等于"复刻难度"被覆盖了 —— 见报告 §5 的硬上限。');
