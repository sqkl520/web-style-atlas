#!/usr/bin/env node
/* s13 —— 当前工作树的取舍前沿（锚定版，快）。
 *
 * s13 的第一版对每个 n 都重跑一遍 C(34,n) 的枚举，n=12 时是 C(34,12)=5.48 亿，
 * 跑不完。改成锚定：难点案先钉住，只在补位里枚举。这在数学上等价于
 * 「在含全部难点案的解集里求最优」，而难点案本来就是要钉住的约束，
 * 所以不会丢解 —— 只是把「不含全部难点」的那部分解直接排除掉。
 *
 * 目标（先声明，字典序）：层覆盖 > 未复刻过 > tone 去重 > structure 去重
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
const maskOfId = new Map();
for (const r of clean) {
  let m = 0n;
  for (const [d, fn] of STRATA) { const k = d + '=' + fn(r); if (!keyId.has(k)) keyId.set(k, BigInt(keyId.size)); m |= 1n << keyId.get(k); }
  maskOfId.set(r.id, m);
}
const STRATA_N = keyId.size;
const pc = (x) => { let c = 0; while (x) { x &= x - 1n; c++; } return c; };
const UNION = ['S08', 'S15', 'S18', 'S21', 'S22', 'S29', 'S31', 'S32', 'S33', 'S35'];
const toneN = new Set(clean.map((r) => r.tone)).size;
const REPL = new Set(REPLICATED);

console.log('s13 —— 当前工作树的取舍前沿（锚定全部 10 个可测难点案）');
console.log('='.repeat(78));
console.log(`坏案 ${[...BROKEN].join(' ') || '无'}；宇宙 ${N} 案；层 ${STRATA_N}；tone ${toneN}`);
console.log(`可测难点 ${UNION.length} 案: ${UNION.join(' ')}\n`);

function evalSel(list) {
  let m = 0n;
  const st = new Set(), tones = new Set();
  let fresh = 0;
  for (const id of list) {
    m |= maskOfId.get(id); st.add(byId[id].structure); tones.add(byId[id].tone);
    if (!REPL.has(id)) fresh++;
  }
  return { layer: pc(m), tones: tones.size, struct: st.size, fresh, mask: m };
}

console.log('## 锚定 10 个难点案后，补位案数 vs 收益（方案 = 10 难点 + 补位）');
console.log('  补位 n  总数  层/总  tone  struct  未复刻  方案');
const table = [];
const rest = ids.filter((x) => !UNION.includes(x));
function combos(arr, k, cb, start = 0, acc = []) {
  if (acc.length === k) { cb(acc); return; }
  for (let i = start; i < arr.length; i++) { acc.push(arr[i]); combos(arr, k, cb, i + 1, acc); acc.pop(); }
}
for (let extra = 0; extra <= 5; extra++) {
  let best = null, ties = 0;
  combos(rest, extra, (acc) => {
    const list = [...UNION, ...acc];
    const s = evalSel(list);
    const key = [s.layer, s.fresh, s.tones, s.struct];
    if (!best || key.join() > best.key.join() || true) {
      const cmp = (a, b) => { for (let i = 0; i < 4; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
      if (!best || cmp(key, best.key) > 0) { best = { key, list: list.slice().sort(), s }; ties = 1; }
      else if (cmp(key, best.key) === 0) { if (best.list.join() > list.slice().sort().join()) best = { key, list: list.slice().sort(), s }; ties++; }
    }
  });
  if (!best) continue;
  const full = best.s.layer === STRATA_N && best.s.tones === toneN;
  console.log(`  ${String(extra).padStart(2)}     ${String(10 + extra).padStart(2)}   ${String(best.s.layer).padStart(2)}/${STRATA_N}    ${best.s.tones}/${toneN}     ${best.s.struct}       ${best.s.fresh}/${10 + extra}     ${best.list.join(' ')}${full ? '  ★' : ''}`);
  table.push({ extra, n: 10 + extra, ...best.s, ids: best.list, ties, full });
}

const chief = table.find((t) => t.full);
console.log(`\n## 最小可行规模：${chief ? chief.n + ' 案' : '（≥15 案内无解）'}`);
if (chief) {
  console.log(`   ${chief.ids.join(' ')}`);
  console.log(`   层 ${chief.layer}/${STRATA_N}  tone ${chief.tones}/${toneN}  structure ${chief.struct}/23  未复刻过 ${chief.fresh}/${chief.n}  难点 10/10`);
  console.log(`   并列解 ${chief.ties} 个`);
  console.log('\n   逐案：');
  for (const id of chief.ids) {
    const r = byId[id];
    const tag = UNION.includes(id) ? '难点' : '补位';
    console.log(`     ${id} [${tag}] ${r.tone} | ${r.structure} | chroma ${String(r.chroma).padStart(3)} | pics ${String(r.minPics).padStart(2)} | words ${String(r.words).padStart(4)} | ${r.ground}/${r.load} | 门槛${r.threshold}${r.hard ? ' | hard' : ''} | gate ${r.gateFail}`);
  }
  const tones = {};
  for (const id of chief.ids) { const t = byId[id].tone.split(' / ')[0]; tones[t] = (tones[t] || 0) + 1; }
  console.log('   tone 计数: ' + Object.entries(tones).map(([k, v]) => `${k}=${v}`).join(' '));
  const covered = new Set(chief.ids.map((x) => byId[x].structure));
  console.log(`   structure ${covered.size}/23，零覆盖: ${[...new Set(clean.map((r) => r.structure))].filter((s) => !covered.has(s)).join(' ')}`);
}

console.log('\n## 上一轮 8 案（同一把尺子）');
const p = evalSel(PREV8);
console.log(`   层 ${p.layer}/${STRATA_N}  tone ${p.tones}/${toneN}  structure ${p.struct}/23  难点 0/10  未复刻 ${p.fresh}/8`);
console.log('   未覆盖层: ' + [...keyId.keys()].filter((k) => !(p.mask & (1n << keyId.get(k)))).join(' ; '));

/* 8 案的最优（不钉难点）也给出，作为成本对照 */
console.log('\n## 对照：若只能 8 案（不钉全部难点，求最优）');
let b8 = null;
combos(ids, 8, (acc) => {
  const s = evalSel(acc);
  const key = [s.layer, s.fresh, s.tones, s.struct];
  const cmp = (a, b) => { for (let i = 0; i < 4; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
  if (!b8 || cmp(key, b8.key) > 0 || (cmp(key, b8.key) === 0 && acc.slice().sort().join() < b8.list.join())) {
    b8 = { key, list: acc.slice().sort(), s };
  }
});
const h8 = b8.list.filter((x) => UNION.includes(x));
console.log(`   ${b8.list.join(' ')}`);
console.log(`   层 ${b8.s.layer}/${STRATA_N}  tone ${b8.s.tones}/${toneN}  structure ${b8.s.struct}/23  难点 ${h8.length}/10 (${h8.join(' ')})  未复刻 ${b8.s.fresh}/8`);

writeFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s13-current-pareto.json'), JSON.stringify({
  universe: N, broken: [...BROKEN], strataTotal: STRATA_N, toneTotal: toneN, union: UNION,
  anchored: table.map((t) => ({ extra: t.extra, n: t.n, layer: t.layer, tones: t.tones, struct: t.struct, fresh: t.fresh, ids: t.ids, ties: t.ties, full: t.full })),
  chief: chief ? chief.ids : null,
  best8: b8.list,
  best8stats: { layer: b8.s.layer, tones: b8.s.tones, struct: b8.s.struct, fresh: b8.s.fresh },
  prev8stats: { layer: p.layer, tones: p.tones, struct: p.struct, fresh: p.fresh },
}, null, 1));
console.log('\n→ s13-current-pareto.json 已写');
