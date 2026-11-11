#!/usr/bin/env node
/* s05 —— 加约束的优化：把「提示词坏掉的案」从覆盖目标里拿出来。
 *
 * s04 的最优解有 5 个是 S31–S35，而 s03 证明那 5 案的提示词是坏的
 * （plain 空 → "请把整页做成这个风格：。"；S34 还要 3 张图但机制是零位图）。
 * 拿坏提示词去做盲测，量到的是提示词缺陷，不是风格难度 —— 两种信号混在一个数里，
 * 这个仓库管那叫"假绿"。所以这里把 promptBroken 从 STRATA 里删掉，
 * 改成一条硬排除，再穷举一次。坏的那 5 案单独作为「先修再测」的一档报出来。
 *
 * 准则（先声明）：
 *   一级：覆盖的层数最大（层 = 9 个维度里的 (维度,取值)，不含 promptOK）
 *   二级：structure 标签去重数最大
 *   三级：难点并集（A/B/C/D/E）案数最大
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const all = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s01-dataset.json'), 'utf8'));
const audit = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s03-prompt-audit.json'), 'utf8'));
const BROKEN = new Set(audit.bad);
const cls = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s02-classes.json'), 'utf8'));
const UNION = new Set(cls.union);

const rows = all.filter((r) => !BROKEN.has(r.id));   // 30 案
const N = rows.length;
console.log(`s05 —— 只在 ${N} 个提示词完好的案里穷举 C(${N},8) = ${(() => { let r = 1n; for (let i = 0; i < 8; i++) r = r * BigInt(N - i) / BigInt(i + 1); return r.toLocaleString(); })()}`);
console.log(`   剔除的 ${BROKEN.size} 案: ${[...BROKEN].join(' ')}\n`);

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
];

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

const K = 8;
let best = [], bestScore = [-1, -1, -1], evaluated = 0;
const cmp = (a, b) => (a[0] !== b[0] ? a[0] - b[0] : a[1] !== b[1] ? a[1] - b[1] : a[2] - b[2]);
function consider(sel) {
  evaluated++;
  let m = 0n, hard = 0; const st = new Set();
  for (const j of sel) { m |= itemMask[j]; hard += itemHard[j]; st.add(itemStruct[j]); }
  const sc = [popcount(m), st.size, hard];
  const c = cmp(sc, bestScore);
  if (c > 0) { bestScore = sc; best = [sel.slice()]; }
  else if (c === 0 && best.length < 200) best.push(sel.slice());
}
const t0 = Date.now();
for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) for (let c = b + 1; c < N; c++)
  for (let d = c + 1; d < N; d++) for (let e = d + 1; e < N; e++) for (let f = e + 1; f < N; f++)
    for (let g = f + 1; g < N; g++) for (let h = g + 1; h < N; h++) consider([a, b, c, d, e, f, g, h]);
console.log(`   穷举 ${evaluated.toLocaleString()} 个组合，耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`   最优：层 ${bestScore[0]}/${STRATA_TOTAL}   structure ${bestScore[1]}   难点案 ${bestScore[2]}   并列 ${best.length}\n`);

/* 未覆盖层（对某个选择） */
const missOf = (sel) => {
  const covered = sel.reduce((m, i) => m | itemMask[i], 0n);
  return [...keyId.entries()].filter(([, id]) => !(covered & (1n << id))).map(([k]) => k);
};

/* 并列解之间怎么合法地分出高下？用「覆盖不到的高代价层最少」不行——那又是加权。
 * 改用一条纯机械且事先成立的规则：先比「跨 tone 的均衡度」的最后一名：
 * 对 7 个 tone，统计每个 tone 在样本里的个数，取最小值最大（maximin）。
 * 理由不是审美：tone 是最粗的用户可感知维度，8 案里若某 tone 只有 0 案，那一档完全没测。
 * 这条规则在 s04 里没有，所以 s04 的结论只是一个上界，s05 才是推荐。 */
const toneOf = rows.map((r) => r.tone);
const toneList = [...new Set(toneOf)];
function maximin(sel) {
  const cnt = new Map(toneList.map((t) => [t, 0]));
  for (const i of sel) cnt.set(toneOf[i], cnt.get(toneOf[i]) + 1);
  return Math.min(...cnt.values());
}
const sorted = best.map((s) => ({ s, mm: maximin(s) })).sort((x, y) => y.mm - x.mm ||
  (x.s.map((i) => idOf[i]).join(',') < y.s.map((i) => idOf[i]).join(',') ? -1 : 1));
const chosen = sorted[0];
console.log(`## maximin（7 个 tone 中最少的那个的案数）在并列解里的分布：`);
console.log('   ' + [...new Set(sorted.map((x) => x.mm))].map((v) => `${v}:${sorted.filter((x) => x.mm === v).length}个`).join('  '));

function describe(sel) {
  console.log('   案: ' + sel.map((i) => idOf[i]).join(' '));
  console.log('   tone: ' + [...new Set(sel.map((i) => toneOf[i]))].join(' / ') + `  (${new Set(sel.map((i) => toneOf[i])).size}/7)`);
  console.log('   structure: ' + sel.map((i) => itemStruct[i]).join(' ') + `  (${new Set(sel.map((i) => itemStruct[i])).size} 个)`);
  console.log('   chroma: ' + sel.map((i) => rows[i].chroma).join(' '));
  console.log('   minPics: ' + sel.map((i) => rows[i].minPics).join(' '));
  console.log('   ground: ' + [...new Set(sel.map((i) => rows[i].ground))].join(' '));
  console.log('   load: ' + [...new Set(sel.map((i) => rows[i].load))].join(' '));
  console.log('   难点: ' + sel.filter((i) => itemHard[i]).map((i) => idOf[i]).join(' '));
  console.log('   未覆盖层: ' + (missOf(sel).join(' ; ') || '（全覆盖）'));
}
console.log('\n## 推荐方案（s05）');
describe(chosen.s);

/* 逐 tone 的计数，证明均衡 */
const cnt = new Map(toneList.map((t) => [t, 0]));
for (const i of chosen.s) cnt.set(toneOf[i], cnt.get(toneOf[i]) + 1);
console.log('\n   逐 tone 计数: ' + toneList.map((t) => `${t}=${cnt.get(t)}`).join('  '));

/* 上一轮 8 案在这个新尺子上 */
const PREV = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];
const prevSel = PREV.map((id) => idOf.indexOf(id)).filter((i) => i >= 0);
let pm = 0n; for (const i of prevSel) pm |= itemMask[i];
console.log(`\n## 上一轮 8 案（30 案口径下同一把尺子）`);
console.log(`   覆盖层 ${popcount(pm)}/${STRATA_TOTAL}   structure ${new Set(prevSel.map((i) => itemStruct[i])).size}   难点 ${prevSel.filter((i) => itemHard[i]).length}   maximin ${maximin(prevSel)}`);
console.log('   未覆盖层: ' + missOf(prevSel).join(' ; ') || '（全覆盖）');

/* 若要 9 案 / 10 案，边际收益是多少 —— 回答"为什么不是更多" */
function bestFor(k) {
  let bs = [-1, -1, -1], bl = 0;
  const rec = (start, sel) => {
    if (sel.length === k) {
      let m = 0n, hard = 0; const st = new Set();
      for (const j of sel) { m |= itemMask[j]; hard += itemHard[j]; st.add(itemStruct[j]); }
      const sc = [popcount(m), st.size, hard];
      const c = cmp(sc, bs);
      if (c > 0) { bs = sc; } else if (c === 0) bl++;
      return;
    }
    for (let i = start; i < N; i++) { sel.push(i); rec(i + 1, sel); sel.pop(); }
  };
  rec(0, []);
  return bs;
}
console.log('\n## 案数—收益曲线（回答「为什么不选更多」）');
for (const k of [6, 7, 8, 9, 10]) {
  const s = bestFor(k);
  console.log(`   ${String(k).padStart(2)} 案 → 层 ${s[0]}/${STRATA_TOTAL}  structure ${s[1]}  难点 ${s[2]}`);
}

writeFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s05-constrained.json'),
  JSON.stringify({ chosen: chosen.s.map((i) => idOf[i]), cover: bestScore[0], strataTotal: STRATA_TOTAL, structs: bestScore[1], hard: bestScore[2], maximin: chosen.mm, ties: best.length, excluded: [...BROKEN] }, null, 1));
console.log('\n→ s05-constrained.json 已写');
