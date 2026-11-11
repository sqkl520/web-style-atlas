#!/usr/bin/env node
/* s12 —— 在**当前工作树**上重算。为什么需要这一步：
 *
 * s01–s11 算的时候，prompts.js 里 S31–S35 的 plain / scenes 全是空的（s03 当时实测 5/5 坏）。
 * 我跑完之后工作树被并发修过（`build-prompts.mjs` 补了 HUMAN 表 5 条 + 加了 check-prompts 的 D1 断言，
 * `prompts.js` 随之重新生成）。现在 s03 复测只剩 **S34 一案**坏（falsy-0 的 minPics 仍未修）。
 *
 * 结论会变，所以必须重算，不能拿旧数当结论。两版都留在报告里，并标明各自的时间点。
 *
 * 本脚本把「可测宇宙」定义成：35 案减去 s03 当前判定的坏案。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const rows = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s01-dataset.json'), 'utf8'));
const audit = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s03-prompt-audit.json'), 'utf8'));
const BROKEN = new Set(audit.bad);
const REPLICATED = ['S03', 'S06', 'S07', 'S14', 'S17', 'S19', 'S23', 'S24', 'S26'];
const PREV8 = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];

const clean = rows.filter((r) => !BROKEN.has(r.id));
const N = clean.length;
const ids = clean.map((r) => r.id);
const byId = Object.fromEntries(clean.map((r) => [r.id, r]));

console.log('s12 —— 当前工作树重算');
console.log('='.repeat(78));
console.log(`坏提示词的案（s03 当前判定）: ${[...BROKEN].join(' ') || '（无）'}`);
console.log(`可测宇宙: ${N} / 35 案\n`);

/* ---------- 1. 五类难点（当前口径） ---------- */
const CL = {
  A: { name: 'chroma ≤ 25', f: (r) => r.chroma <= 25 },
  B: { name: 'hard', f: (r) => r.hard === true },
  C: { name: 'minPics ≤ 1', f: (r) => r.minPics <= 1 },
  D: { name: 'Q2 新建 S31–S35', f: (r) => Number(r.id.slice(1)) >= 31 },
  E: { name: 'gate.fail > 0', f: (r) => r.gateFail > 0 },
};
console.log('## 1. 五类难点（可测宇宙口径）');
for (const [k, c] of Object.entries(CL)) {
  const m = clean.filter(c.f).map((r) => r.id);
  console.log(`   ${k} ${c.name.padEnd(20)} K=${m.length}  ${m.join(' ')}`);
}
const UNION = [...new Set(Object.values(CL).flatMap((c) => clean.filter(c.f).map((r) => r.id)))].sort();
console.log(`\n   并集 K=${UNION.length}/${N}: ${UNION.join(' ')}`);
const NON = ids.filter((x) => !UNION.includes(x));
console.log(`   非难点 ${NON.length} 案: ${NON.join(' ')}`);

/* 命中数分布 */
const hits = clean.map((r) => ({ r, h: Object.values(CL).filter((c) => c.f(r)).map((c, i) => Object.keys(CL)[i]).filter(Boolean) }));
const hitOf = new Map(clean.map((r) => {
  const h = Object.entries(CL).filter(([, c]) => c.f(r)).map(([k]) => k);
  return [r.id, h];
}));
const dist = new Map();
for (const r of clean) { const n = hitOf.get(r.id).length; dist.set(n, (dist.get(n) || 0) + 1); }
console.log(`   命中数分布: ${[...dist.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}类=${v}案`).join('  ')}`);
console.log('\n   逐案:');
for (const r of clean) {
  const h = hitOf.get(r.id);
  if (h.length) console.log(`     ${r.id} [${h.join('')}]  chroma=${String(r.chroma).padStart(3)} hard=${r.hard ? 'Y' : '.'} pics=${r.minPics} Q2=${Number(r.id.slice(1)) >= 31 ? 'Y' : '.'} fail=${r.gateFail}`);
}

/* ---------- 2. 精确超几何：上一轮 8 案 ---------- */
const C = (n2, k) => { if (k < 0 || k > n2 || n2 < 0) return 0n; let r = 1n; for (let i = 0; i < k; i++) r = (r * BigInt(n2 - i)) / BigInt(i + 1); return r; };
const pv = (num, den) => Number((num * 100000000n) / den) / 1e8;
const pct = (x) => (x * 100).toFixed(4) + '%';
const K = UNION.length;
const den8 = C(N, 8);
console.log(`\n## 2. 上一轮的 8 案（S09 S28 S03 S07 S14 S19 S26 S24）在新口径下`);
const prevHit = PREV8.filter((x) => UNION.includes(x));
console.log(`   命中 ${prevHit.length}/8 ${prevHit.length ? '(' + prevHit.join(' ') + ')' : '（全漏）'}`);
const p0 = pv(C(N - K, 8), den8);
console.log(`   P(随机 8 案全漏并集) = C(${N - K},8)/C(${N},8) = ${C(N - K, 8)}/${den8} = ${pct(p0)} = 1/${(1 / p0).toFixed(1)}`);
for (const [k, c] of Object.entries(CL)) {
  const m = clean.filter(c.f).length;
  console.log(`     ${k} 单独: K=${String(m).padStart(2)}  P(全漏)=${pct(pv(C(N - m, 8), den8)).padStart(9)}`);
}
/* 8 案在 35 案口径下（与上一轮可比） */
const den35 = C(35, 8);
const u35 = ['S08', 'S15', 'S18', 'S21', 'S22', 'S29', 'S31', 'S32', 'S33', 'S34', 'S35'];
console.log(`   参考（35 案口径，与上一轮完全同口径）: K=11, P(全漏)=${pct(pv(C(24, 8), den35))}`);

/* ---------- 3. 锚定选案（当前宇宙） ---------- */
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
const structOf = clean.map((r) => r.structure);
const toneOf = clean.map((r) => r.tone);
const fresh = clean.map((r) => (REPLICATED.includes(r.id) ? 0 : 1));
const isHard = clean.map((r) => (UNION.includes(r.id) ? 1 : 0));
const toneN = new Set(toneOf).size;
const cmpArr = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };

function solve(n, kHard) {
  let bs = [-1, -1, -1, -1], keep = [];
  const rec = (start, sel) => {
    if (sel.length === n) {
      const h = sel.reduce((a, i) => a + isHard[i], 0);
      if (h < kHard) return;
      let m = 0n; const st = new Set(); let f = 0;
      for (const i of sel) { m |= masks[i]; st.add(structOf[i]); f += fresh[i]; }
      const sc = [pc(m), f, new Set(sel.map((i) => toneOf[i])).size, st.size];
      const c = cmpArr(sc, bs);
      if (c > 0) { bs = sc; keep = [sel.slice()]; } else if (c === 0 && keep.length < 60) keep.push(sel.slice());
      return;
    }
    for (let i = start; i < clean.length; i++) { sel.push(i); rec(i + 1, sel); sel.pop(); }
  };
  rec(0, []);
  keep.sort((x, y) => (x.map((i) => ids[i]).join() < y.map((i) => ids[i]).join() ? -1 : 1));
  return { bs, keep };
}

console.log(`\n## 3. 案数决策（当前宇宙，层 ${STRATA_N}，tone ${toneN}，难点 ${K} 案）`);
console.log('   准则：层 > 未复刻过 > tone 去重 > structure；约束「至少 k 个难点案」');
console.log('\n   ## 目标 A：钉住全部难点案');
console.log('   n   层/总  tone  未测  struct  方案');
for (let n = K; n <= 12; n++) {
  const { bs, keep } = solve(n, K);
  if (bs[0] < 0) continue;
  const labels = keep[0].map((i) => ids[i]);
  const mark = (bs[0] === STRATA_N && bs[2] === toneN) ? ' ★' : '';
  console.log(`   ${String(n).padStart(2)}   ${String(bs[0]).padStart(2)}/${STRATA_N}     ${bs[2]}/${toneN}   ${bs[1]}/${n}      ${bs[3]}       ${labels.join(' ')}${mark}`);
}
console.log('\n   ## 目标 B：不钉难点');
console.log('   n   层/总  tone  难点  struct  方案');
for (let n = 6; n <= 10; n++) {
  const { bs, keep } = solve(n, 0);
  const labels = keep[0].map((i) => ids[i]);
  const h = keep[0].reduce((a, i) => a + isHard[i], 0);
  console.log(`   ${String(n).padStart(2)}   ${String(bs[0]).padStart(2)}/${STRATA_N}     ${bs[2]}/${toneN}    ${h}     ${bs[3]}       ${labels.join(' ')}`);
}

writeFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s12-current.json'), JSON.stringify({
  broken: [...BROKEN], universe: N, union: UNION, strataTotal: STRATA_N, toneTotal: toneN,
  prevHit, pAllMiss: p0, prev8: PREV8, replicated: REPLICATED,
}, null, 1));
console.log('\n→ s12-current.json 已写');
