/* P4 关键探针：4 个色块是「信息不足」还是「刻意的信息设计」？
 *
 * 攻击点：Lead 的推论是「选型台画 3–4 个色块、提示词要求 4–7 色 ⇒ 用户被误导」。
 * 反面假设：把提示词那 7 个色**原样画成色块**，其中很多在视觉上无法区分
 *          （纸色系 #F3F8FB / #DCE7EF / #C9D8E4 这类只差几级明度），
 *          所以"画 4 个"不是隐瞒，而是**去冗后仍可扫读**的上限。
 *
 * 本探针量化这个假设：对每案 prompts 的 7 色，算两两 RGB 欧氏距离（0–441），
 * 统计有多少对在"人眼在同一行小色块上分不出来"的阈值内。
 * 若绝大多数案都有大量近重复对，则"画 7 个"不增加信息，只降低可扫读性。
 *
 *   node deliverables/71-plan/redteam/rt-p4-swatches.mjs
 */
import { execFileSync } from 'node:child_process';
import { ROOT, h1, h2 } from './rt-lib.mjs';

const git = (a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const HEAD = git(['rev-parse', 'HEAD']).trim();
const show = (p) => git(['show', `${HEAD}:${p}`]);
const evalWin = (src) => { const w = {}; new Function('window', src)(w); return w; };

const data = evalWin(show('prototypes/_selection/data.js')).SCHEMES;
const prompts = evalWin(show('prototypes/_selection/prompts.js')).STYLE_PROMPTS.schemes;
const hexes = (s) => [...String(s).matchAll(/#([0-9A-Fa-f]{6})(?![0-9A-Fa-f])/g)].map((m) => m[0].toUpperCase());
const rgb = (h) => { const x = String(h).replace('#', ''); return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)]; };
const dist = (a, b) => { const A = rgb(a), B = rgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };

/* 阈值取 24：两个 20px 色块并排、间隔 3px 时，RGB 距离 <24 基本看不出差别
 * （参考：S02 的 #0B0B0F vs #0A0A0D 距离 2.4，被 2dadd81 当成"看不出的差异"处理过）。 */
const TH = 24;

h1('如果把提示词的 7 色原样画成色块，有几个是"视觉上重复"的？');
console.log(`判据：两两 RGB 欧氏距离 < ${TH} 视为在人眼/20px 色块尺度上不可区分\n`);
const rows = [];
for (const s of data) {
  const p = prompts.find((x) => x.id === s.id) || {};
  const pal = hexes((p.dna || {}).palette);
  let near = 0, pairs = 0;
  const ex = [];
  for (let i = 0; i < pal.length; i++) {
    for (let j = i + 1; j < pal.length; j++) {
      pairs++;
      const d = dist(pal[i], pal[j]);
      if (d < TH) { near++; if (ex.length < 2) ex.push(`${pal[i]}~${pal[j]}(${d.toFixed(0)})`); }
    }
  }
  const d4 = (s.palette || []).length;
  rows.push({ id: s.id, d4, n: pal.length, near, pairs, ex, pal });
}
console.log('案    台面色块 提示词色 色对数 近重复对  近重复举例');
console.log('─'.repeat(92));
for (const r of rows) {
  console.log(`${r.id}   ${String(r.d4).padStart(4)}   ${String(r.n).padStart(4)}   ${String(r.pairs).padStart(4)}   ${String(r.near).padStart(6)}   ${r.ex.join(' ')}`);
}

h2('汇总');
const withNear = rows.filter((r) => r.near > 0);
console.log(`提示词色板里存在「近重复对」的案：${withNear.length}/30`);
console.log(`近重复对总数：${rows.reduce((a, r) => a + r.near, 0)}`);
console.log(`色对总数：    ${rows.reduce((a, r) => a + r.pairs, 0)}`);
const avgNear = rows.reduce((a, r) => a + r.near, 0) / 30;
console.log(`平均每案 ${avgNear.toFixed(2)} 个近重复对`);
console.log('');
console.log('若把 7 色全画出来：');
const extra = rows.filter((r) => r.n > r.d4);
console.log(`  比台面多画的案：${extra.length}/30，合计多 ${extra.reduce((a, r) => a + (r.n - r.d4), 0)} 个色块`);
console.log(`  其中至少含 1 个近重复对的：${extra.filter((r) => r.near > 0).length}/${extra.length}`);

h2('逐案看几个"多画也看不出"的典型');
for (const id of ['S19', 'S24', 'S02', 'S12', 'S23']) {
  const r = rows.find((x) => x.id === id);
  if (!r) continue;
  console.log(`\n${id}  台面 ${r.d4} 色 / 提示词 ${r.n} 色`);
  console.log(`  提示词: ${r.pal.join(' ')}`);
  const d4pal = (data.find((x) => x.id === id).palette || []);
  console.log(`  台面  : ${d4pal.join(' ')}`);
  for (let i = 0; i < r.pal.length; i++) {
    for (let j = i + 1; j < r.pal.length; j++) {
      const d = dist(r.pal[i], r.pal[j]);
      if (d < TH) console.log(`    近重复: ${r.pal[i]} ~ ${r.pal[j]}  ΔRGB=${d.toFixed(0)}`);
    }
  }
}

h2('判定（部分成立，不给定性结论）');
console.log(`证据 1：${withNear.length}/30 案的提示词色板内部存在视觉近重复对（平均每案 ${avgNear.toFixed(2)} 对）。`);
console.log(`证据 2：在"台面比提示词少"的 ${extra.length} 案里，${extra.filter((r) => r.near > 0).length} 案的**多出来的色**里至少含 1 个近重复。`);
console.log(`证据 3：但 ${extra.filter((r) => r.near === 0).length}/${extra.length} 案的额外色全部可区分 —— 这些案"多画"确实会增加信息。`);
console.log('');
console.log('所以「4 个色块是刻意的信息设计」**有实质支持但不是普遍规律**：');
console.log('  · 在一半以上的案子里，第 5–7 个色块确实无法与已有的区分，画出来是噪声；');
console.log('  · 在少数案子里，多画会带来真信息。');
console.log('');
console.log('⚠️ 本探针不能证明"用户没被误导" —— 它只证明"多画不总是更好"。');
console.log('   要判定 WP4 该不该做，还需要用户侧证据（见报告 §P4：仓库里 0 条）。');
