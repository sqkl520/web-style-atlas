#!/usr/bin/env node
/* s09 —— 二维前沿：难点案数 × 未曾复刻过的案数。
 *
 * s08 把「未复刻过」放在第 4 位，于是它总是被前面的准则压住。但那不是中立的排序：
 * 74-q7 已经对着 9 案做过盲测并出了报告，再抽到它们得到的是**回归**信息，
 * 得不到"这套提示词能不能复刻一个没见过的风格"这个问题的答案。
 * 所以这次把它提到第 2 位，看代价是什么。
 *
 * 准则（先声明，字典序）：
 *   ① 层覆盖数最大  ② 未复刻过的案数最大  ③ tone 去重最大  ④ structure 去重最大
 * 然后对每个 (难点案数 ≥ k) 输出最优解，形成 k × 未测数 的二维表。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const rows = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s01-dataset.json'), 'utf8'));
const audit = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s03-prompt-audit.json'), 'utf8'));
const BROKEN = new Set(audit.bad);
const REPLICATED = ['S03', 'S06', 'S07', 'S14', 'S17', 'S19', 'S23', 'S24', 'S26']; // 74-q7 out-*.html
const SAMPLED = ['S09', 'S28'];                                                     // 上一轮抽过但没复刻
const byIdAll = Object.fromEntries(rows.map((r) => [r.id, r]));

const clean = rows.filter((r) => !BROKEN.has(r.id));
const ids = clean.map((r) => r.id);
const byId = Object.fromEntries(clean.map((r) => [r.id, r]));

const chromaBand = (c) => (c <= 25 ? 'chroma≤25' : c <= 59 ? 'chroma26-59' : 'chroma≥60');
const picBand = (p) => (p <= 1 ? 'pics0-1' : p <= 5 ? 'pics2-5' : p <= 7 ? 'pics6-7' : 'pics8-10');
const wordBand = (w) => (w < 200 ? 'words<200' : w < 500 ? 'words200-499' : w < 800 ? 'words500-799' : 'words≥800');
const STRATA = [
  ['tone', (r) => r.tone], ['chroma', (r) => chromaBand(r.chroma)], ['pics', (r) => picBand(r.minPics)],
  ['ground', (r) => r.ground], ['load', (r) => r.load], ['threshold', (r) => '门槛' + r.threshold],
  ['hard', (r) => (r.hard ? 'hard' : 'notHard')], ['gateFail', (r) => (r.gateFail > 0 ? 'fail>0' : 'fail=0')],
  ['words', (r) => wordBand(r.words)],
];
const keyId = new Map();
const masks = clean.map((r) => {
  let m = 0n;
  for (const [d, fn] of STRATA) { const k = d + '=' + fn(r); if (!keyId.has(k)) keyId.set(k, BigInt(keyId.size)); m |= 1n << keyId.get(k); }
  return m;
});
const STRATA_N = keyId.size;
const pc = (x) => { let c = 0; while (x) { x &= x - 1n; c++; } return c; };

const UNION = ['S08', 'S15', 'S18', 'S21', 'S22', 'S29'];
const isHard = clean.map((r) => (UNION.includes(r.id) ? 1 : 0));
const structOf = clean.map((r) => r.structure);
const toneOf = clean.map((r) => r.tone);
const fresh = clean.map((r) => (REPLICATED.includes(r.id) ? 0 : 1));  // 未曾复刻过
const toneList = [...new Set(toneOf)];
const toneCover = (sel) => new Set(sel.map((i) => toneOf[i])).size;

const cmpArr = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };

console.log('s09 —— 二维前沿：难点覆盖 × 新信息');
console.log('='.repeat(78));
console.log(`宇宙 ${clean.length} 案；层 ${STRATA_N}；可测难点并集 ${UNION.join(' ')}`);
console.log(`已复刻过（74-q7 out-*.html）${REPLICATED.length} 案: ${REPLICATED.join(' ')}`);
console.log(`上一轮抽过但未复刻: ${SAMPLED.join(' ')}\n`);
console.log('准则：层 > 未复刻过 > tone 去重 > structure 去重（字典序，无加权）\n');

function best(kHard) {
  let bs = [-1, -1, -1, -1], keep = [];
  const rec = (start, sel) => {
    if (sel.length === 8) {
      const h = sel.reduce((a, i) => a + isHard[i], 0);
      if (h < kHard) return;
      let m = 0n; const st = new Set(); let f = 0;
      for (const i of sel) { m |= masks[i]; st.add(structOf[i]); f += fresh[i]; }
      const sc = [pc(m), f, toneCover(sel), st.size];
      const c = cmpArr(sc, bs);
      if (c > 0) { bs = sc; keep = [sel.slice()]; }
      else if (c === 0 && keep.length < 100) keep.push(sel.slice());
      return;
    }
    for (let i = start; i < clean.length; i++) { sel.push(i); rec(i + 1, sel); sel.pop(); }
  };
  rec(0, []);
  keep.sort((x, y) => (x.map((i) => ids[i]).join() < y.map((i) => ids[i]).join() ? -1 : 1));
  return { bs, keep };
}

console.log('  k  层/总  未测  tone  struct  难点  方案');
console.log('  ' + '-'.repeat(76));
const table = [];
for (let k = 0; k <= 6; k++) {
  const { bs, keep } = best(k);
  const sel = keep[0];
  const h = sel.reduce((a, i) => a + isHard[i], 0);
  const labels = sel.map((i) => ids[i]);
  table.push({ k, layer: bs[0], fresh: bs[1], tone: bs[2], struct: bs[3], hard: h, ids: labels, ties: keep.length });
  console.log(`  ${k}  ${String(bs[0]).padStart(2)}/${STRATA_N}    ${bs[1]}/8    ${bs[2]}/7     ${bs[3]}      ${h}    ${labels.join(' ')}`);
}

/* 最优前沿：哪些 k 是"不被支配"的 */
console.log('\n## 被支配的解（在层、未测、tone、structure 四项上都不占优）');
const nondominated = table.filter((a) => !table.some((b) =>
  b !== a && b.layer >= a.layer && b.fresh >= a.fresh && b.tone >= a.tone && b.struct >= a.struct &&
  (b.layer > a.layer || b.fresh > a.fresh || b.tone > a.tone || b.struct > a.struct) &&
  b.hard >= a.hard));
for (const r of table) {
  const dom = nondominated.includes(r);
  console.log(`  k=${r.k}  ${dom ? '★ 非支配' : '  被支配'}  ${r.ids.join(' ')}`);
}

/* 逐案角色表，给报告用 */
console.log('\n## 非支配解的逐案明细');
for (const r of nondominated) {
  console.log(`\n  k=${r.k}  ${r.ids.join(' ')}`);
  console.log(`    层 ${r.layer}/${STRATA_N}  未复刻过 ${r.fresh}/8  tone ${r.tone}/7  structure ${r.struct}/23  难点 ${r.hard}/6`);
  const sel = r.ids.map((x) => ids.indexOf(x));
  const cov = sel.reduce((m, i) => m | masks[i], 0n);
  const miss = [...keyId.keys()].filter((k2) => !(cov & (1n << keyId.get(k2))));
  console.log(`    未覆盖层: ${miss.join(' ; ') || '（全覆盖）'}`);
  console.log(`    已复刻过的: ${r.ids.filter((x) => REPLICATED.includes(x)).join(' ') || '（无）'}`);
}

writeFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s09-frontier2.json'),
  JSON.stringify({ table, nondominated: nondominated.map((r) => r.ids), strataTotal: STRATA_N, replicated: REPLICATED, excluded: [...BROKEN] }, null, 1));
console.log('\n→ s09-frontier2.json 已写');
