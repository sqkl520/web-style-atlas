#!/usr/bin/env node
/* s08 —— 方案不宜只给一个。这里把「难点锚点数」当作可调旋钮，
 * 对锚点数 k=2..6 各跑一次穷举，输出帕累托前沿，让取舍摆在台面上。
 *
 * 为什么 s07 的做法不够：硬钉 6 个难点案后只剩 2 个位置，tone 最多只能覆盖 5/7
 * （6 锚点已占 3 个 tone，每加一案最多补 1 个）。而 tone 是用户唯一能直接感知的维度。
 * 所以"钉几个难点案"不该拍脑袋，要看它换掉了多少别的维度。
 *
 * 顺带修掉 s07 的一处报数错误：s07 打印的 "tone 7/7" 是 Map 的 size（恒为 7），
 * 不是"覆盖到几个 tone"。正确算法是数出 count>0 的项。这里用 coveredTones()。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const rows = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s01-dataset.json'), 'utf8'));
const audit = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s03-prompt-audit.json'), 'utf8'));
const BROKEN = new Set(audit.bad);
const ALREADY = ['S03', 'S06', 'S07', 'S14', 'S17', 'S19', 'S23', 'S24', 'S26'];
const PREV8 = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];

const clean = rows.filter((r) => !BROKEN.has(r.id));
const byId = Object.fromEntries(clean.map((r) => [r.id, r]));
const ids = clean.map((r) => r.id);

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

/* 正确的 tone 计数 */
const toneOf = clean.map((r) => r.tone);
const toneList = [...new Set(toneOf)];
function toneCover(sel) {          // sel = 下标数组
  const c = new Map(toneList.map((t) => [t, 0]));
  for (const i of sel) c.set(toneOf[i], c.get(toneOf[i]) + 1);
  return { distinct: [...c.values()].filter((v) => v > 0).length, min: Math.min(...c.values()), counts: c };
}

const UNION = ['S08', 'S15', 'S18', 'S21', 'S22', 'S29'];
const isHard = clean.map((r) => (UNION.includes(r.id) ? 1 : 0));
const structOf = clean.map((r) => r.structure);
const tested = clean.map((r) => (ALREADY.includes(r.id) ? 1 : 0));

const cmpArr = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };

console.log('s08 —— 帕累托前沿：钉几个难点案，要付多少代价');
console.log('='.repeat(78));
console.log(`宇宙 ${clean.length} 案（剔除提示词坏的 5 案）；可测难点并集 ${UNION.join(' ')}（6 案）`);
console.log(`层总数 ${STRATA_N}\n`);

/* 对每个 k（至少包含多少个难点案），穷举最优 */
function bestWithMinHard(kHard) {
  let best = [-1, -1, -1, -1], keep = [];
  const rec = (start, sel) => {
    if (sel.length === 8) {
      const h = sel.reduce((a, i) => a + isHard[i], 0);
      if (h < kHard) return;
      let m = 0n; const st = new Set(); let t = 0;
      for (const i of sel) { m |= masks[i]; st.add(structOf[i]); t += tested[i]; }
      const tc = toneCover(sel);
      const sc = [pc(m), tc.distinct, st.size, t];
      const c = cmpArr(sc, best);
      if (c > 0) { best = sc; keep = [sel.slice()]; }
      else if (c === 0 && keep.length < 60) keep.push(sel.slice());
      return;
    }
    for (let i = start; i < clean.length; i++) { sel.push(i); rec(i + 1, sel); sel.pop(); }
  };
  rec(0, []);
  return { best, keep };
}

console.log('k = "8 案里至少包含几个可测难点案"；固定 8 案总数；准则：层 > tone 去重 > structure > 未复刻过\n');
console.log('  k  层/总  tone  struct  难点实际  方案');
console.log('  ' + '-'.repeat(76));
const rowsOut = [];
for (let k = 0; k <= 6; k++) {
  const { best, keep } = bestWithMinHard(k);
  keep.sort((x, y) => (x.map((i) => ids[i]).join() < y.map((i) => ids[i]).join() ? -1 : 1));
  const sel = keep[0];
  const h = sel.reduce((a, i) => a + isHard[i], 0);
  const labels = sel.map((i) => ids[i]);
  rowsOut.push({ k, cover: best[0], tone: best[1], struct: best[2], untested: best[3], hard: h, ids: labels, ties: keep.length });
  console.log(`  ${k}  ${String(best[0]).padStart(2)}/${STRATA_N}   ${best[1]}/7     ${best[2]}       ${h}        ${labels.join(' ')}`);
}

/* 逐 k 的明细 */
console.log('\n## 明细');
for (const r of rowsOut) {
  const sel = r.ids.map((x) => ids.indexOf(x));
  const tc = toneCover(sel);
  console.log(`\n  k=${r.k}  ${r.ids.join(' ')}`);
  console.log(`    层 ${r.cover}/${STRATA_N}，tone ${tc.distinct}/7，structure ${r.struct}/23，难点 ${r.hard}/6，未复刻过 ${r.untested}/8（并列解 ${r.ties}）`);
  console.log(`    tone 分布: ${[...tc.counts.entries()].map(([t, n]) => t.split(' / ')[0] + '=' + n).join(' ')}`);
  const cov = sel.reduce((m, i) => m | masks[i], 0n);
  const miss = [...keyId.keys()].filter((k2) => !(cov & (1n << keyId.get(k2))));
  console.log(`    未覆盖: ${miss.join(' ; ') || '（全覆盖）'}`);
}

/* 上一轮 8 案在同一把尺子上 */
const prevSel = PREV8.map((x) => ids.indexOf(x));
const prevCov = prevSel.reduce((m, i) => m | masks[i], 0n);
const prevTc = toneCover(prevSel);
console.log('\n## 上一轮 8 案（同一把尺子）');
console.log(`   层 ${pc(prevCov)}/${STRATA_N}  tone ${prevTc.distinct}/7  structure ${new Set(prevSel.map((i) => structOf[i])).size}/23  难点 0/6  未复刻过 2/8`);
const prevMiss = [...keyId.keys()].filter((k2) => !(prevCov & (1n << keyId.get(k2))));
console.log(`   未覆盖: ${prevMiss.join(' ; ')}`);

/* 稳健性：k=6 时并列解有多少，tone 是否恒为 5 */
console.log('\n## 稳健性检查');
for (const k of [5, 6]) {
  const { keep } = bestWithMinHard(k);
  const tones = new Set(keep.map((s) => toneCover(s).distinct));
  const structs = new Set(keep.map((s) => new Set(s.map((i) => structOf[i])).size));
  console.log(`   k=${k}: 并列 ${keep.length} 个解，tone 去重取值 ${[...tones].join('/')}，structure 取值 ${[...structs].join('/')}`);
  console.log(`         ⇒ k=${k} 的最优值${tones.size === 1 ? '唯一确定' : '在并列解间浮动'}${tones.size === 1 ? '，不是我从并列里挑出来的' : ''}`);
}

writeFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s08-pareto.json'),
  JSON.stringify({ frontier: rowsOut, prev: { ids: PREV8, cover: pc(prevCov), tone: prevTc.distinct, structs: 8, hard: 0 }, strataTotal: STRATA_N }, null, 1));
console.log('\n→ s08-pareto.json 已写');
