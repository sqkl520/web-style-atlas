/**
 * 02 · palette 语义判定（Q2 的核心）：用数据回答「一个错一个对」还是「两个都对、语义不同」。
 *
 * 判定需要四个独立证据，缺一不可：
 *
 *   E1  子集关系：L1(palette@data.js) 的每个色，是否都在 L3(palette@prompts.js) 里？
 *       —— 若 L1 ⊂ L3 恒成立，说明两者**不是两个互相矛盾的事实**，而是「同一集合的两个截断」。
 *   E2  截断位置：L1 少掉的那几个色，在 L3 序列里排第几？
 *       —— 若全排在尾部，说明 L1 就是「L3 的前 N 个」；若夹杂在中间，说明是两种不同的挑选策略。
 *   E3  被丢掉的色「重不重要」：用**渲染面**量，不用规格文字量。
 *       (a) 静态样式面出现次数（style.css ∪ index.html 的 style/SVG ∪ assets/*.svg）
 *       (b) 主题变量引用次数（var(--x) 被用了多少次）
 *       (c) CDP 实测：这个色在 1440 视口首屏真的画出来的**面积占比**
 *   E4  app.js:508 的 slice(0,4)：前 4 个是不是「底色+主色+两个最重要的辅助」？
 *       —— 逐案检查 L3 序列的第 5 个及以后，有没有比前 4 个里某个更该出现的。
 *
 * 运行：node deliverables/71-plan/facts/02-palette-semantics.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  IDS, PROTO, DIR_OF, loadData, loadPrompts, loadDnaClean, readRoot, hexOf,
  paletteOfData, paletteOfPrompts, paletteOfDna, sameSet, sameSeq, jaccard, writeJson, mdTable,
} from './lib.mjs';

const D = Object.fromEntries(loadData().rows.map((r) => [r.id, r]));
const P = Object.fromEntries(loadPrompts().doc.schemes.map((r) => [r.id, r]));
const C = Object.fromEntries(loadDnaClean().rows.map((r) => [r.id, r]));

/* ── E3a 静态样式面：这个 hex 被写了多少次 ──────────────────────────
 * 口径与 collect-schemes.mjs 的 styleSurface() 一致（style.css ∪ index.html 的
 * <style>/style=/SVG 表现属性 ∪ assets/*.svg），但**独立实现**，因为那个函数是
 * data.js 的生成依据 —— 我要检验它，就不能直接用它。
 * 为什么不用「全文件扫 index.html」：S28 的 #EC4899 在正文里出现 1 次，是讲反例的散文，
 * 不是渲染面（collect-schemes.mjs:84-86 已经踩过这个坑）。
 */
function styleSurface(dir) {
  const parts = [];
  const css = join(PROTO, dir, 'style.css');
  if (existsSync(css)) parts.push(readFileSync(css, 'utf8'));
  const html = join(PROTO, dir, 'index.html');
  if (existsSync(html)) {
    const t = readFileSync(html, 'utf8');
    for (const m of t.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) parts.push(m[1]);
    for (const m of t.matchAll(/\bstyle\s*=\s*"([^"]*)"/gi)) parts.push(m[1]);
    for (const m of t.matchAll(/\bstyle\s*=\s*'([^']*)'/gi)) parts.push(m[1]);
    for (const m of t.matchAll(/\b(?:fill|stroke|stop-color|flood-color|color|lighting-color)\s*=\s*["']([^"']*)["']/gi)) parts.push(m[1]);
  }
  const ad = join(PROTO, dir, 'assets');
  if (existsSync(ad)) {
    for (const f of readdirSafe(ad)) if (/\.svg$/i.test(f)) parts.push(readFileSync(join(ad, f), 'utf8'));
  }
  return parts.join('\n');
}
function readdirSafe(p) {
  try { return readFileSync ? require('node:fs').readdirSync(p) : []; } catch { return []; }
}

/* 主题变量 → 引用次数。palette 里的色常常只写一次在 :root，真正的"用量"体现在
 * 被 var() 引用了多少次。这条是 E3a 的补充，不是替代：
 * 一个色可以"只声明一次"但撑起整页底色（bg），也可以"声明一次且没人用"（死变量）。 */
function varUsage(id) {
  const dir = DIR_OF[id];
  if (!dir) return {};
  const surface = styleSurface(dir);
  const root = readRoot(id);
  const out = {};
  for (const d of root.declarations) {
    const h = hexOf(d.value);
    if (!h) continue;
    const re = new RegExp('var\\(\\s*' + d.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[,)]', 'g');
    const n = (surface.match(re) || []).length;
    out[h] = (out[h] || 0) + n;
  }
  return out;
}

/* ── E3a 主表 ─────────────────────────────────────────────────── */
const rows = [];
for (const id of IDS) {
  const l1 = paletteOfData(D[id].palette);
  const l3 = paletteOfPrompts(P[id].dna.palette);
  const l2 = paletteOfDna(C[id].palette);
  const surface = styleSurface(DIR_OF[id]);
  const usage = varUsage(id);

  const hexCount = (h) => {
    const re = new RegExp(h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return (surface.match(re) || []).length;
  };

  const dropped = l3.filter((h) => !l1.includes(h));   // L3 有、L1 没有
  const extra = l1.filter((h) => !l3.includes(h));     // L1 有、L3 没有（若为空则 L1⊂L3）

  rows.push({
    id,
    L1: l1, L2: l2, L3: l3,
    L1_len: l1.length, L3_len: l3.length,
    subset: extra.length === 0,
    extra,
    seq_eq: sameSeq(l1, l3),
    jaccard: +jaccard(l1, l3).toFixed(4),
    /* 顺序证据：L1 是不是 L3 的保序子序列？
     * 若成立，说明 L1 = 「L3 去掉若干项」，两套值同源；若不成立，说明是两种排序策略。 */
    L1_is_subseq_of_L3: (() => {
      let j = 0;
      for (const h of l3) if (j < l1.length && l1[j] === h) j++;
      return j === l1.length;
    })(),
    dropped: dropped.map((h) => ({
      hex: h,
      pos_in_L3: l3.indexOf(h) + 1,          // 1-based
      cssCount: hexCount(h),
      varRefs: usage[h] || 0,
      is_bg: h === (D[id].bg || ''),
    })),
    kept: l1.map((h, i) => ({ hex: h, pos_in_L3: l3.indexOf(h) + 1, cssCount: hexCount(h), varRefs: usage[h] || 0, idx: i })),
    // app.js:508 画 slice(0,4)
    first4: l3.slice(0, 4),
    beyond4: l3.slice(4),
  });
}

/* ── 汇总 ─────────────────────────────────────────────────────── */
const sum = {
  n: rows.length,
  subset: rows.filter((r) => r.subset).length,
  seq_eq: rows.filter((r) => r.seq_eq).length,
  L1_subseq_of_L3: rows.filter((r) => r.L1_is_subseq_of_L3).length,
  set_eq: rows.filter((r) => sameSet(r.L1, r.L3)).length,
  meanJaccard: +(rows.reduce((a, r) => a + r.jaccard, 0) / rows.length).toFixed(4),
  totalDropped: rows.reduce((a, r) => a + r.dropped.length, 0),
  totalKept: rows.reduce((a, r) => a + r.kept.length, 0),
  droppedWithZeroCss: rows.reduce((a, r) => a + r.dropped.filter((d) => d.cssCount === 0).length, 0),
  droppedWithZeroVarRefs: rows.reduce((a, r) => a + r.dropped.filter((d) => d.varRefs === 0).length, 0),
  keptWithZeroVarRefs: rows.reduce((a, r) => a + r.kept.filter((d) => d.varRefs === 0).length, 0),
  // 被丢掉的色里，有多少排在 L3 的前 4 位（= 如果 UI 画 4 个，本来会画到它）
  droppedInTop4: rows.reduce((a, r) => a + r.dropped.filter((d) => d.pos_in_L3 <= 4).length, 0),
};
/* 逐案：L1 覆盖了 L3 前 4 位的几个 */
sum.top4Coverage = rows.map((r) => {
  const top4 = r.L3.slice(0, 4);
  return { id: r.id, covered: top4.filter((h) => r.L1.includes(h)).length, of: top4.length };
});
sum.top4Full = sum.top4Coverage.filter((x) => x.covered === x.of).length;

writeJson('02-palette-semantics.json', { at: new Date().toISOString(), summary: sum, rows });

console.log('=== 02 palette 语义判定 ===');
console.log('案数 ' + sum.n);
console.log('E1 子集：L1 ⊂ L3 成立 ' + sum.subset + '/30');
console.log('E2 保序：L1 是 L3 的保序子序列 ' + sum.L1_subseq_of_L3 + '/30 · 序列完全相同 ' + sum.seq_eq + '/30 · 集合完全相同 ' + sum.set_eq + '/30');
console.log('   平均 Jaccard ' + sum.meanJaccard);
console.log('E3 被丢掉的色共 ' + sum.totalDropped + ' 个（保留 ' + sum.totalKept + ' 个）');
console.log('   其中样式面出现 0 次：' + sum.droppedWithZeroCss + ' 个');
console.log('   其中 var() 引用 0 次：' + sum.droppedWithZeroVarRefs + ' 个');
console.log('   其中排在 L3 前 4 位（UI 本会画出来）：' + sum.droppedInTop4 + ' 个');
console.log('E4 L3 的前 4 位被 L1 完全覆盖的案：' + sum.top4Full + '/30');

console.log('\n[逐案] 长度 / 子集 / 保序 / 丢掉几个');
console.log(mdTable(['案', 'L1 长', 'L3 长', 'L1⊂L3', 'L1 是 L3 保序子序列', '丢掉', '被丢的色(位置/样式面次数/var引用)'],
  rows.map((r) => [r.id, r.L1_len, r.L3_len, r.subset ? '✓' : '✗ 多出 ' + r.extra.join(','), r.L1_is_subseq_of_L3 ? '✓' : '✗',
    r.dropped.length,
    r.dropped.map((d) => d.hex + '(#' + d.pos_in_L3 + '/' + d.cssCount + '/' + d.varRefs + ')').join(' ') || '—'])));

console.log('\n→ deliverables/71-plan/facts/02-palette-semantics.json');
