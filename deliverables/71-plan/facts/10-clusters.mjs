/**
 * 10 · 用「色族（ΔE<10 聚类）」重算面积 —— 这是 Q2 最决定性的一张表。
 *
 * 为什么必须再做一次：
 * 04 已经指出被丢的 52 个色里 33 个与保留色 ΔE<10。但那时是把每个 hex 单独算面积的，
 * 于是出现一个**看起来耸人听闻、实际是测量假象**的数字：
 *   S06 的 data.js 底色 #ECDEC6 只占 0.169%，而被丢的 #E4D5B8 占 62.13%。
 * 真相是：页面底色被纹理/渐变渲染成 #E4D5B8 这一族值，而**逐像素最近邻归类**会把
 * 这类像素全部判给与它 ΔE 更近的那个 hex。同一个"纸色"于是被拆成两个名字。
 * 结论不是"data.js 少了 62% 的颜色"，而是"逐 hex 统计会把同一色族切成几块"。
 *
 * 正确的口径：先按 ΔE<10 把 L1 ∪ L3 聚成**色族**，再算每族的总面积。
 * 然后回答一个干净的问题：
 *   「有多少面积落在**完全不含任何 L1 色**的色族里？」
 *   若是 0 或极小 → data.js 的 4 个色在"色族"层面是完整的，只是没列全同族深浅档。
 *   若很大      → data.js 真的漏了独立的色。
 *
 * 运行：node deliverables/71-plan/facts/10-clusters.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IDS, FACTS, loadData, loadPrompts, paletteOfData, paletteOfPrompts, writeJson, mdTable } from './lib.mjs';

const D = Object.fromEntries(loadData().rows.map((r) => [r.id, r]));
const P = Object.fromEntries(loadPrompts().doc.schemes.map((r) => [r.id, r]));
const pixels = JSON.parse(readFileSync(join(FACTS, '03-pixels.json'), 'utf8'));
const px = Object.fromEntries(pixels.rows.filter((r) => !r.error).map((r) => [r.id, r]));

const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function rgb2lab([r, g, b]) {
  const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const R = f(r), G = f(g), B = f(b);
  let X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  let Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
  let Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
  X /= 0.95047; Y /= 1; Z /= 1.08883;
  const t = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  const fx = t(X), fy = t(Y), fz = t(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const dE = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

/* 单链聚类：按面积从大到小取种子，ΔE<TH 归入同族。
 * 单链（而非 k-means）的理由：这里的"同族"是**感知上分不出**，是传递关系；
 * 用质心法会把 #ECDEC6 与 #E4D5B8 分到两族，正是我们要避免的。 */
const TH = 10;

const rows = [];
for (const id of IDS) {
  const p = px[id];
  if (!p) continue;
  const l1 = paletteOfData(D[id].palette);
  const l3 = paletteOfPrompts(P[id].dna.palette);
  const all = [...new Set([...l1, ...l3])];
  const pct = p.pct;
  const sorted = [...all].sort((a, b) => (pct[b] || 0) - (pct[a] || 0));

  const clusters = [];
  for (const h of sorted) {
    const lab = rgb2lab(hex2rgb(h));
    let target = null;
    for (const c of clusters) {
      if (dE(lab, c.repLab) < TH) { target = c; break; }
    }
    if (!target) { target = { rep: h, repLab: lab, members: [], area: 0 }; clusters.push(target); }
    target.members.push(h);
  }
  for (const c of clusters) c.area = +c.members.reduce((a, h) => a + (pct[h] || 0), 0).toFixed(3);
  for (const c of clusters) c.hasL1 = c.members.some((h) => l1.includes(h));
  clusters.sort((a, b) => b.area - a.area);

  const areaWithL1 = +clusters.filter((c) => c.hasL1).reduce((a, c) => a + c.area, 0).toFixed(3);
  const areaNoL1 = +clusters.filter((c) => !c.hasL1).reduce((a, c) => a + c.area, 0).toFixed(3);
  const familiesNoL1 = clusters.filter((c) => !c.hasL1);

  rows.push({
    id, l1, l3, clusters: clusters.map((c) => ({ rep: c.rep, members: c.members, area: c.area, hasL1: c.hasL1 })),
    nClusters: clusters.length,
    areaWithL1, areaNoL1, familiesNoL1,
    /* L1 的 4 个色覆盖了几个色族 */
    l1FamiliesCovered: clusters.filter((c) => c.hasL1).length,
    l1Count: l1.length,
  });
}

const sum = {
  n: rows.length,
  meanAreaWithL1: +(rows.reduce((a, r) => a + r.areaWithL1, 0) / rows.length).toFixed(2),
  meanAreaNoL1: +(rows.reduce((a, r) => a + r.areaNoL1, 0) / rows.length).toFixed(2),
  /* 决定性数字：有多少案存在"完全不含 L1 色的色族"，且它显著（>1%） */
  cases_familyNoL1: rows.filter((r) => r.familiesNoL1.length > 0).map((r) => ({
    id: r.id, area: +r.familiesNoL1.reduce((a, c) => a + c.area, 0).toFixed(2),
    families: r.familiesNoL1.map((c) => c.members.join('+') + '@' + c.area + '%'),
  })),
  cases_familyNoL1_gt1: rows.filter((r) => r.areaNoL1 > 1).map((r) => r.id + ':' + r.areaNoL1 + '%'),
  cases_familyNoL1_gt5: rows.filter((r) => r.areaNoL1 > 5).map((r) => r.id + ':' + r.areaNoL1 + '%'),
  /* L1 的 4 个色是否"一色一族"（若是，说明没浪费槽位） */
  l1AllDistinctFamilies: rows.filter((r) => r.l1FamiliesCovered === r.l1Count).length,
  l1Redundant: rows.filter((r) => r.l1FamiliesCovered < r.l1Count).map((r) => r.id + ':' + r.l1FamiliesCovered + '/' + r.l1Count),
  /* L3 的 7 个色覆盖了几个族 */
  l3FamilyRedundancy: rows.map((r) => ({ id: r.id, clusters: r.nClusters, l3: r.l3.length })),
};
writeJson('10-clusters.json', { at: new Date().toISOString(), summary: sum, rows });

console.log('=== 10 色族聚类重算（ΔE<' + TH + ' 为同族）===');
console.log('平均面积：落在「含 L1 色」的族 ' + sum.meanAreaWithL1 + '% · 落在「完全不含 L1 色」的族 ' + sum.meanAreaNoL1 + '%');
console.log('存在"完全不含 L1 色"的色族的案：' + sum.cases_familyNoL1.length + '/30');
console.log('  其中面积 >1%：' + (sum.cases_familyNoL1_gt1.join(' ') || '无'));
console.log('  其中面积 >5%：' + (sum.cases_familyNoL1_gt5.join(' ') || '无'));
console.log('L1 的 4 色各自独立成族（没有浪费槽位）：' + sum.l1AllDistinctFamilies + '/30');
if (sum.l1Redundant.length) console.log('  L1 内部有同族冗余：' + sum.l1Redundant.join(' '));
console.log('');
console.log('明细（完全不含 L1 色的族）：');
for (const c of sum.cases_familyNoL1) console.log('  ' + c.id + '  合计 ' + c.area + '%  ← ' + c.families.join('  '));
console.log('');
console.log(mdTable(['案', 'L1 色数', '色族数', '含L1面积%', '不含L1面积%'],
  rows.map((r) => [r.id, r.l1Count, r.nClusters, r.areaWithL1, r.areaNoL1])));
console.log('');
console.log('→ deliverables/71-plan/facts/10-clusters.json');
