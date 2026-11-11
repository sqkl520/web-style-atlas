#!/usr/bin/env node
/* s04 —— 分层抽样优化器：穷举 C(35,8) = 23,535,820 个组合，按**先声明后计算**的
 * 覆盖准则排序，找出最优 8 案。搜索不含随机数，结果可复现。
 *
 * 为什么要穷举而不是贪心：贪心的结果依赖起始案，别人复算会得到不同的表，
 * 而"可复算"是这个仓库对结论的基本要求。C(35,8) 在 node 里跑得动。
 *
 * 准则（先写下，再算，不允许看了结果回头改）：
 *   一级：覆盖的"层"数量最大。层 = 下面 STRATA 里每一个 (维度, 取值)。
 *   二级：structure 标签去重数最大（23 个标签不可能全测，尽量多）。
 *   三级：难点并集内的案数最大。
 * 三个维度按字典序比较，不做加权 —— 加权等于偷偷写死"哪个维度更重要"。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const rows = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s01-dataset.json'), 'utf8'));
const audit = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s03-prompt-audit.json'), 'utf8'));
const BROKEN = new Set(audit.bad);
const classes = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s02-classes.json'), 'utf8'));
const UNION = new Set(classes.union);

/* ---- 层的定义：全部来自 s01 的实测字段，阈值写成本文件里的常量，不藏在函数里 ---- */
const chromaBand = (c) => (c <= 25 ? 'chroma≤25' : c <= 59 ? 'chroma26-59' : 'chroma≥60');
const picBand = (p) => (p <= 1 ? 'pics0-1' : p <= 5 ? 'pics2-5' : p <= 7 ? 'pics6-7' : 'pics8-10');
const wordBand = (w) => (w < 200 ? 'words<200' : w < 500 ? 'words200-499' : w < 800 ? 'words500-799' : 'words≥800');

const STRATA = [
  ['tone', (r) => r.tone],
  ['chroma', (r) => chromaBand(r.chroma)],
  ['pics', (r) => picBand(r.minPics)],
  ['ground', (r) => r.ground],
  ['load', (r) => r.load],
  ['threshold', (r) => '门槛' + r.threshold],
  ['hard', (r) => (r.hard ? 'hard' : 'notHard')],
  ['gateFail', (r) => (r.gateFail > 0 ? 'fail>0' : 'fail=0')],
  ['words', (r) => wordBand(r.words)],
  ['promptOK', (r) => (BROKEN.has(r.id) ? 'promptBroken' : 'promptOK')],
];

/* 给每一案算一个 bitmask */
const size = rows.length;
const N = size;
const bits = rows.map((r) => {
  let m = 0n, i = 0n;
  for (const [, fn] of STRATA) { m |= 1n << i; i++; }  // 占位，下面重建
  return 0;
});
/* 真正的层 ID：把 (维度,取值) 拍平成一个整数 */
const keyId = new Map();
const itemMask = rows.map((r) => {
  let m = 0n;
  for (const [dim, fn] of STRATA) {
    const k = dim + '=' + fn(r);
    if (!keyId.has(k)) keyId.set(k, BigInt(keyId.size));
    m |= 1n << keyId.get(k);
  }
  return m;
});
const STRATA_TOTAL = keyId.size;
const itemStruct = rows.map((r) => r.structure);
const itemHard = rows.map((r) => (UNION.has(r.id) ? 1 : 0));
const idOf = rows.map((r) => r.id);

const popcount = (x) => { let c = 0; while (x) { x &= x - 1n; c++; } return c; };

/* ---- 穷举 C(35,8) ---- */
const K = 8;
let best = [];
let bestScore = [-1, -1, -1];
let evaluated = 0;
const idx = [];
const idxW = [];

function consider(sel) {
  evaluated++;
  let m = 0n;
  let hard = 0;
  const structs = new Set();
  for (let i = 0; i < sel.length; i++) {
    const j = sel[i];
    m |= itemMask[j];
    hard += itemHard[j];
    structs.add(itemStruct[j]);
  }
  const cover = popcount(m);
  const st = structs.size;
  const sc = [cover, st, hard];
  const cmp = (a, b) => (a[0] !== b[0] ? a[0] - b[0] : a[1] !== b[1] ? a[1] - b[1] : a[2] - b[2]);
  if (cmp(sc, bestScore) > 0) {
    bestScore = sc; best = [sel.slice()];
  } else if (cmp(sc, bestScore) === 0 && best.length < 40) {
    best.push(sel.slice());
  }
}

/* 组合生成：8 层循环，跑满 23.5M */
const t0 = Date.now();
for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) for (let c = b + 1; c < N; c++)
  for (let d = c + 1; d < N; d++) for (let e = d + 1; e < N; e++) for (let f = e + 1; f < N; f++)
    for (let g = f + 1; g < N; g++) for (let h = g + 1; h < N; h++) {
      consider([a, b, c, d, e, f, g, h]);
    }
const dt = Date.now() - t0;
console.log(`s04 —— 穷举 ${evaluated.toLocaleString()} 个组合，耗时 ${(dt / 1000).toFixed(1)}s`);
console.log(`层总数 ${STRATA_TOTAL}（来自 ${STRATA.length} 个维度）`);
console.log(`最优覆盖层数 ${bestScore[0]}/${STRATA_TOTAL}，structure 去重 ${bestScore[1]}，难点案 ${bestScore[2]}`);
console.log(`并列最优解 ${best.length} 个${best.length === 40 ? '+（只留前 40）' : ''}\n`);

function describe(sel, verbose = true) {
  const ids = sel.map((i) => idOf[i]);
  const missLayers = [...keyId.keys()].filter((k) => {
    let present = false;
    for (const i of sel) { if (itemMask[i] & (1n << keyId.get(k))) present = true; }
    return !present;
  });
  if (!verbose) return { ids, missLayers };
  console.log('  案: ' + ids.join(' '));
  console.log(`  tone: ${[...new Set(sel.map((i) => rows[i].tone))].join(' / ')}`);
  console.log(`  structure: ${[...new Set(sel.map((i) => itemStruct[i]))].join(' ')}  （${new Set(sel.map((i) => itemStruct[i])).size} 个）`);
  console.log(`  chroma: ${sel.map((i) => rows[i].chroma).join(' ')}`);
  console.log(`  minPics: ${sel.map((i) => rows[i].minPics).join(' ')}`);
  console.log(`  难点命中: ${sel.map((i) => (itemHard[i] ? rows[i].id : '')).filter(Boolean).join(' ')}`);
  console.log(`  未覆盖的层(${missLayers.length}): ${missLayers.join(' ; ')}`);
  return { ids, missLayers };
}

/* 并列解很多时，用「覆盖不到的层」作为稳定的对外展示：先看前 8 个并列解的共同缺口 */
console.log('## 前若干个并列最优解');
for (const sel of best.slice(0, 8)) { describe(sel); console.log(); }

/* 并列解怎么挑？加一条**事先没写进 score** 的展示性判据会破坏可复算性。
 * 所以改用：在并列解里，取「案号字典序最小」的那一个，纯机械、无裁量。 */
const chosen = best.map((s) => s.slice()).sort((x, y) => {
  const a = x.map((i) => idOf[i]).join(','), b = y.map((i) => idOf[i]).join(',');
  return a < b ? -1 : a > b ? 1 : 0;
})[0];
console.log('='.repeat(78));
console.log('## 机械选定的方案（并列解中案号字典序最小）');
const c = describe(chosen);

/* ---- 与上一轮 8 案对照 ---- */
const PREV = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];
function scoreOf(ids) {
  const sel = ids.map((id) => idOf.indexOf(id));
  let m = 0n;
  for (const i of sel) m |= itemMask[i];
  return {
    ids, cover: popcount(m), structs: new Set(sel.map((i) => itemStruct[i])).size,
    hard: sel.filter((i) => itemHard[i]).length,
    tones: new Set(sel.map((i) => rows[i].tone)).size,
  };
}
const sPrev = scoreOf(PREV);
console.log(`\n## 上一轮 8 案的同一把尺子`);
console.log(`  覆盖层 ${sPrev.cover}/${STRATA_TOTAL}，structure ${sPrev.structs}，难点案 ${sPrev.hard}，tone ${sPrev.tones}/7`);
console.log(`  我的方案 覆盖层 ${c.missLayers ? bestScore[0] : '?'}/${STRATA_TOTAL}，structure ${bestScore[1]}，难点案 ${bestScore[2]}`);
console.log(`  层覆盖差 ${bestScore[0] - sPrev.cover}；structure 差 ${bestScore[1] - sPrev.structs}`);

writeFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s04-optimum.json'),
  JSON.stringify({ chosen: c.ids, cover: bestScore[0], strataTotal: STRATA_TOTAL, structs: bestScore[1], hard: bestScore[2], prev: sPrev, ties: best.map((s) => s.map((i) => idOf[i])) }, null, 1));
console.log('\n→ s04-optimum.json 已写');
