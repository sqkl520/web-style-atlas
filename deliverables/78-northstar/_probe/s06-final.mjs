#!/usr/bin/env node
/* s06 —— 两件事：
 *  (1) 阈值稳健性：难点类的判定界线落在数据里的自然断点上吗？换个阈值结论会不会翻？
 *      —— 这决定"8 案全漏"这个结论有多稳，还是只是我把线画在了刚好让它成立的地方。
 *  (2) 信息增益约束：deliverables/74-q7 已经复刻过 9 案，再抽到它们只得到回归信息，
 *      得不到新信息。把"未测过"作为一条**事先声明**的次级判据再穷举一次。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const rows = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s01-dataset.json'), 'utf8'));
const audit = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s03-prompt-audit.json'), 'utf8'));
const BROKEN = new Set(audit.bad);
const N = rows.length;
const idOf = rows.map((r) => r.id);
const PREV8 = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];
const ALREADY = ['S03', 'S06', 'S07', 'S14', 'S17', 'S19', 'S23', 'S24', 'S26']; // 74-q7 out-*.html

const C = (n, k) => { if (k < 0 || k > n) return 0n; let r = 1n; for (let i = 0; i < k; i++) r = (r * BigInt(n - i)) / BigInt(i + 1); return r; };
const pStr = (num, den) => Number((num * 100000000n) / den) / 1e8;
const pct = (x) => (x * 100).toFixed(4) + '%';

console.log('s06 —— 阈值稳健性与信息增益');
console.log('='.repeat(78));

/* ---------- (1) 阈值稳健性 ---------- */
console.log('\n## (1a) chroma 阈值的自然断点');
const ch = [...rows.map((r) => r.chroma)].sort((a, b) => a - b);
console.log('   升序: ' + ch.join(' '));
let bestGap = { g: -1 };
for (let i = 1; i < ch.length; i++) if (ch[i] - ch[i - 1] > bestGap.g) bestGap = { g: ch[i] - ch[i - 1], lo: ch[i - 1], hi: ch[i] };
console.log(`   最大空隙 ${bestGap.g}：${bestGap.lo} → ${bestGap.hi}`);
console.log(`   ⇒ 判定线只要落在 [${bestGap.lo}, ${bestGap.hi - 1}] 区间内，成员完全相同。`);
for (const t of [20, 25, 28, 29, 30, 35]) {
  const m = rows.filter((r) => r.chroma <= t).map((r) => r.id);
  console.log(`   chroma ≤ ${String(t).padStart(2)}: K=${m.length}  ${m.join(' ')}`);
}

console.log('\n## (1b) minPics 阈值的自然断点');
const mp = [...new Set(rows.map((r) => r.minPics))].sort((a, b) => a - b);
console.log('   出现的值: ' + mp.join(' '));
for (const t of [1, 2, 3, 4]) {
  const m = rows.filter((r) => r.minPics <= t).map((r) => r.id);
  console.log(`   minPics ≤ ${t}: K=${m.length}  ${m.join(' ')}`);
}

console.log('\n## (1c) 若把 chroma 线挪到 30（一个同样说得通的"很安静"界线）会怎样');
/* 重算 A 类与并集，看上一轮 8 案是否仍全漏 */
function unionAt(chromaT) {
  const A = rows.filter((r) => r.chroma <= chromaT);
  const B = rows.filter((r) => r.hard);
  const Cc = rows.filter((r) => r.minPics <= 1);
  const D = rows.filter((r) => Number(r.id.slice(1)) >= 31);
  const E = rows.filter((r) => r.gateFail > 0);
  return [...new Set([...A, ...B, ...Cc, ...D, ...E].map((r) => r.id))].sort();
}
for (const t of [25, 28, 29, 30]) {
  const u = unionAt(t);
  const hit = PREV8.filter((id) => u.includes(id));
  const K = u.length;
  const p0 = pStr(C(N - K, 8), C(N, 8));
  console.log(`   chroma≤${String(t).padStart(2)}  并集 K=${String(K).padStart(2)}  上一轮 8 案命中 ${hit.length} (${hit.join(' ') || '无'})  P(全漏)=${pct(p0).padStart(9)}`);
}
console.log('   ⇒ 结论方向不随阈值翻转：只有把线放到 29 才勉强命中 1 案，30 才 2 案（S07=29、S19=30 正好贴着线）。');

/* ---------- (2) 已测过 vs 未测过 ---------- */
console.log('\n## (2) 上一轮 8 案与"已复刻池"的关系（信息增益视角）');
const ov = PREV8.filter((id) => ALREADY.includes(id));
console.log(`   已复刻池（74-q7 out-*.html）: ${ALREADY.join(' ')}`);
console.log(`   上一轮 8 案中已在池内: ${ov.length}/8 → ${ov.join(' ')}`);
console.log(`   只有 ${PREV8.filter((id) => !ALREADY.includes(id)).join(' ')} 是新的`);
const den = C(N, 8);
let pge6 = 0n;
for (let k = 6; k <= 8; k++) pge6 += C(ALREADY.length, k) * C(N - ALREADY.length, 8 - k);
console.log(`   P(随机 8 案与 9 案池重叠 ≥6) = ${pStr(pge6, den) * 100}% = 1/${(1 / pStr(pge6, den)).toFixed(0)}`);

/* ---------- (3) 穷举：覆盖优先，其次 structure，其次难点，其次"未测过的案数" ---------- */
const clean = rows.filter((r) => !BROKEN.has(r.id));
const M = clean.length;
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
const UNIONSET = new Set(unionAt(25));
const hardFlag = clean.map((r) => (UNIONSET.has(r.id) ? 1 : 0));
const untested = clean.map((r) => (ALREADY.includes(r.id) ? 0 : 1));
const structsOf = clean.map((r) => r.structure);
const cid = clean.map((r) => r.id);
const pc = (x) => { let c = 0; while (x) { x &= x - 1n; c++; } return c; };

console.log(`\n## (3) 穷举 C(${M},8) = ${C(M, 8).toLocaleString()}，四级字典序：层 > structure > 难点 > 未测过`);
let bs = [-1, -1, -1, -1], bw = 0;
const cmp = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
const t0 = Date.now();
const rec = (start, sel) => {
  if (sel.length === 8) {
    let m = 0n, h = 0, t = 0; const st = new Set();
    for (const j of sel) { m |= masks[j]; h += hardFlag[j]; t += untested[j]; st.add(structsOf[j]); }
    const sc = [pc(m), st.size, h, t];
    const c = cmp(sc, bs);
    if (c > 0) { bs = sc; bw = 1; } else if (c === 0) bw++;
    return;
  }
  for (let i = start; i < M; i++) { sel.push(i); rec(i + 1, sel); sel.pop(); }
};
rec(0, []);
console.log(`   耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s；最优 层 ${bs[0]}/${keyId.size}  structure ${bs[1]}  难点 ${bs[2]}  未测过 ${bs[3]}；并列 ${bw}`);

/* 把并列最优解都收一遍，再按 maximin(tone) + 字典序挑 —— 全部机械 */
let ties = [];
const rec2 = (start, sel) => {
  if (sel.length === 8) {
    let m = 0n, h = 0, t = 0; const st = new Set();
    for (const j of sel) { m |= masks[j]; h += hardFlag[j]; t += untested[j]; st.add(structsOf[j]); }
    if (pc(m) === bs[0] && st.size === bs[1] && h === bs[2] && t === bs[3]) ties.push(sel.slice());
    return;
  }
  for (let i = start; i < M; i++) { sel.push(i); rec2(i + 1, sel); sel.pop(); }
};
rec2(0, []);
console.log(`   并列最优解 ${ties.length} 个`);

const toneOf = clean.map((r) => r.tone);
const toneList = [...new Set(toneOf)];
const maximin = (sel) => { const c = new Map(toneList.map((t) => [t, 0])); for (const i of sel) c.set(toneOf[i], c.get(toneOf[i]) + 1); return Math.min(...c.values()); };
ties = ties.map((s) => ({ s, mm: maximin(s) })).sort((x, y) => y.mm - x.mm || (x.s.map((i) => cid[i]).join() < y.s.map((i) => cid[i]).join() ? -1 : 1));
const chosen = ties[0].s;
console.log(`   maximin 分布: ${[...new Set(ties.map((x) => x.mm))].map((v) => `${v}:${ties.filter((x) => x.mm === v).length}`).join('  ')}`);

function show(sel, label) {
  console.log(`\n   ${label}`);
  console.log(`   案: ${sel.map((i) => cid[i]).join(' ')}`);
  console.log(`   tone: ${[...new Set(sel.map((i) => toneOf[i]))].join(' / ')}  (${new Set(sel.map((i) => toneOf[i])).size}/7)`);
  console.log(`   structure: ${sel.map((i) => structsOf[i]).join(' ')}  (${new Set(sel.map((i) => structsOf[i])).size} 个，全库 23)`);
  console.log(`   chroma: ${sel.map((i) => clean[i].chroma).join(' ')}`);
  console.log(`   minPics: ${sel.map((i) => clean[i].minPics).join(' ')}`);
  console.log(`   words: ${sel.map((i) => clean[i].words).join(' ')}`);
  console.log(`   难点: ${sel.filter((i) => hardFlag[i]).map((i) => cid[i]).join(' ')}`);
  console.log(`   已测过: ${sel.filter((i) => !untested[i]).map((i) => cid[i]).join(' ') || '（无，全是新案）'}`);
  const cov = sel.reduce((m, i) => m | masks[i], 0n);
  const miss = [...keyId.keys()].filter((k) => !(cov & (1n << keyId.get(k))));
  console.log(`   未覆盖层: ${miss.join(' ; ') || '（全覆盖）'}`);
  const c = new Map(toneList.map((t) => [t, 0])); for (const i of sel) c.set(toneOf[i], c.get(toneOf[i]) + 1);
  console.log('   逐 tone: ' + toneList.map((t) => `${t.split(' / ')[0]}=${c.get(t)}`).join(' '));
}
show(chosen, '## 最终推荐（四级字典序 + maximin + 字典序，全机械）');

writeFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s06-final.json'), JSON.stringify({
  chosen: chosen.map((i) => cid[i]), cover: bs[0], strataTotal: keyId.size, structs: bs[1], hard: bs[2], untested: bs[3], ties: ties.length,
  alreadyTested: ALREADY, prev8: PREV8, excluded: [...BROKEN],
}, null, 1));
console.log('\n→ s06-final.json 已写');
