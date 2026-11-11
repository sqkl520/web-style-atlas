#!/usr/bin/env node
/* s10 —— 案数本身也是一个决策。前面都固定 8 案（沿用上一轮的规模），
 * 但"为什么是 8"上一轮没有论证。这里把 n 从 6 到 11 全跑一遍，两个目标分别看：
 *
 *   目标 A（缺陷发现）：先钉住全部 6 个可测难点案，再看最少要几案才能把
 *          tone 7/7 与 层 29/29 同时补回来。
 *   目标 B（覆盖）：不钉难点，求每个 n 下的最优覆盖，看边际收益何时归零。
 *
 * 准则与 s09 相同（层 > 未复刻过 > tone > structure），但把"难点数"改为约束而非目标。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const rows = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s01-dataset.json'), 'utf8'));
const audit = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s03-prompt-audit.json'), 'utf8'));
const BROKEN = new Set(audit.bad);
const REPLICATED = ['S03', 'S06', 'S07', 'S14', 'S17', 'S19', 'S23', 'S24', 'S26'];

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
const fresh = clean.map((r) => (REPLICATED.includes(r.id) ? 0 : 1));
const toneN = new Set(toneOf).size;
const toneCover = (sel) => new Set(sel.map((i) => toneOf[i])).size;
const cmpArr = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };

/* 通用：在 n 案、至少 kHard 个难点的约束下求字典序最优 */
function solve(n, kHard) {
  let bs = [-1, -1, -1, -1], keep = [];
  const rec = (start, sel) => {
    if (sel.length === n) {
      const h = sel.reduce((a, i) => a + isHard[i], 0);
      if (h < kHard) return;
      let m = 0n; const st = new Set(); let f = 0;
      for (const i of sel) { m |= masks[i]; st.add(structOf[i]); f += fresh[i]; }
      const sc = [pc(m), f, toneCover(sel), st.size];
      const c = cmpArr(sc, bs);
      if (c > 0) { bs = sc; keep = [sel.slice()]; } else if (c === 0) keep.push(sel.slice());
      return;
    }
    for (let i = start; i < clean.length; i++) { sel.push(i); rec(i + 1, sel); sel.pop(); }
  };
  rec(0, []);
  keep.sort((x, y) => (x.map((i) => ids[i]).join() < y.map((i) => ids[i]).join() ? -1 : 1));
  return { bs, keep };
}

console.log('s10 —— 案数决策：n = 6..11，两个目标');
console.log('='.repeat(78));
console.log(`宇宙 ${clean.length} 案，层 ${STRATA_N}，tone ${toneN}，可测难点 6 案 ${UNION.join(' ')}\n`);

console.log('## 目标 A：必须包含全部 6 个可测难点案，最少几案能同时拿回 tone 7/7 与层 29/29');
console.log('  n   层/总  tone  未测  struct  方案');
console.log('  ' + '-'.repeat(76));
const tA = [];
for (let n = 6; n <= 11; n++) {
  const { bs, keep } = solve(n, 6);
  const sel = keep[0];
  const labels = sel.map((i) => ids[i]);
  tA.push({ n, layer: bs[0], fresh: bs[1], tone: bs[2], struct: bs[3], ids: labels, ties: keep.length });
  console.log(`  ${n}   ${String(bs[0]).padStart(2)}/${STRATA_N}     ${bs[2]}/${toneN}   ${bs[1]}/${n}     ${bs[3]}       ${labels.join(' ')}`);
}
const minFull = tA.find((r) => r.layer === STRATA_N && r.tone === toneN);
console.log(`  ⇒ 钉住 6 个难点案时，${minFull ? `n=${minFull.n} 案即可同时满足层 29/29 + tone 7/7` : 'n≤11 内无法同时满足'}；8 案当前只能到 ${tA.find((r) => r.n === 8).layer}/29、tone ${tA.find((r) => r.n === 8).tone}/7`);

console.log('\n## 目标 B：不钉难点，每个 n 的最优覆盖（看边际收益何时归零）');
console.log('  n   层/总  tone  未测  难点  struct  方案');
console.log('  ' + '-'.repeat(76));
const tB = [];
for (let n = 6; n <= 10; n++) {   // n=11 是 C(30,11)=54M 量级，边际收益已归零，不再跑
  const { bs, keep } = solve(n, 0);
  const sel = keep[0];
  const labels = sel.map((i) => ids[i]);
  const h = sel.reduce((a, i) => a + isHard[i], 0);
  tB.push({ n, layer: bs[0], fresh: bs[1], tone: bs[2], struct: bs[3], hard: h, ids: labels });
  console.log(`  ${n}   ${String(bs[0]).padStart(2)}/${STRATA_N}     ${bs[2]}/${toneN}   ${bs[1]}/${n}     ${h}     ${bs[3]}       ${labels.join(' ')}`);
}
console.log('\n  边际：');
for (let i = 1; i < tB.length; i++) {
  const a = tB[i - 1], b = tB[i];
  console.log(`    ${a.n}→${b.n}: 层 ${a.layer}→${b.layer}  tone ${a.tone}→${b.tone}  struct ${a.struct}→${b.struct}  难点 ${a.hard}→${b.hard}`);
}
console.log('  ⇒ 层在 7 案就满 29/29；之后每加一案只买到 structure +1。structure 有 23 个标签，');
console.log('    8 案最多覆盖 8 个 = 34.8%，要全覆盖需 23 案 —— 这条路按定义走不通，只能放弃。');

/* 目标 A 的逐案明细（取 8 与 minFull 两个） */
console.log('\n## 逐案明细');
for (const n of [8, minFull ? minFull.n : 9]) {
  const r = tA.find((x) => x.n === n);
  if (!r) continue;
  const sel = r.ids.map((x) => ids.indexOf(x));
  console.log(`\n  n=${n}  ${r.ids.join(' ')}`);
  console.log(`    层 ${r.layer}/${STRATA_N}  tone ${r.tone}/${toneN}  structure ${r.struct}/23  未复刻过 ${r.fresh}/${n}  难点 6/6`);
  const tc = new Map(); for (const i of sel) tc.set(toneOf[i], (tc.get(toneOf[i]) || 0) + 1);
  console.log(`    tone: ${[...tc.entries()].map(([t, c]) => `${t.split(' / ')[0]}=${c}`).join(' ')}`);
  for (const id of r.ids) {
    const x = byId[id];
    const tag = ['S08', 'S15', 'S18', 'S21', 'S22', 'S29'].includes(id) ? '难点' : '补位';
    console.log(`      ${id} [${tag}] ${x.tone} | ${x.structure} | chroma ${x.chroma} | pics ${x.minPics} | words ${x.words} | ${x.ground}/${x.load} | 门槛${x.threshold}${x.hard ? ' | hard' : ''}`);
  }
}

writeFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s10-n-frontier.json'),
  JSON.stringify({ targetA: tA, targetB: tB, strataTotal: STRATA_N, toneTotal: toneN, minFullWithAllHard: minFull || null }, null, 1));
console.log('\n→ s10-n-frontier.json 已写');
