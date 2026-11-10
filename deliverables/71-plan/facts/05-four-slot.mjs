/**
 * 05 · 「只能画 4 个」时，哪种取法最接近真实？（Q2 第 3 问：app.js:508 的 slice(0,4) 对不对）
 *
 * 三种候选策略，都用**实测面积**当裁判：
 *   P_data   data.js 的 palette（3–4 色，就是 UI 现在画的）           —— 现状
 *   P_head4  prompts.js 的 palette.slice(0,4)（"取前 4 个"）          —— 若两边统一成 7 色后的默认取法
 *   P_area   按实测面积取前 4（理论上最好的 4 个）                     —— 上界
 *
 * 裁判指标（两个，缺一不可）：
 *   COVER  这 4 个色覆盖了画面多少百分比（越大越好 → 用户看到的越接近真实）
 *   FIDEL   4 个色里有多少个真的排在实测面积前 4（越大越好 → 没有用不重要的色占位）
 *
 * 另外单独回答一个**不能再靠猜**的问题：`prompts.js` 的 palette 里排第 1 的是不是主色？
 * （build-prompts.mjs:250-259 自己承认「两种口径都不到」，这里用面积给出第三方裁决：
 *   主色应当是有彩色里面积最大的那个，不该是纸色。）
 *
 * 运行：node deliverables/71-plan/facts/05-four-slot.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IDS, loadData, loadPrompts, paletteOfData, paletteOfPrompts, writeJson, mdTable } from './lib.mjs';

const D = Object.fromEntries(loadData().rows.map((r) => [r.id, r]));
const P = Object.fromEntries(loadPrompts().doc.schemes.map((r) => [r.id, r]));
const pixels = JSON.parse(readFileSync(join(import.meta.dirname, '03-pixels.json'), 'utf8'));
const px = Object.fromEntries(pixels.rows.filter((r) => !r.error).map((r) => [r.id, r]));

/* 有彩色度：判断一个色是不是"灰/纸色" */
const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function chromaOf(h) {
  const [r, g, b] = hex2rgb(h).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return +(mx - mn).toFixed(3);
}
/* Lab / ΔE：与 03/04 同一实现 */
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
function lumOf(h) {
  const [r, g, b] = hex2rgb(h).map((v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : Math.pow((v / 255 + 0.055) / 1.055, 2.4)));
  return +(0.2126 * r + 0.7152 * g + 0.0722 * b).toFixed(4);
}

const rows = [];
for (const id of IDS) {
  const p = px[id];
  if (!p) continue;
  const l1 = paletteOfData(D[id].palette);
  const l3 = paletteOfPrompts(P[id].dna.palette);
  const pct = p.pct;
  const byArea = [...Object.keys(pct)].sort((a, b) => pct[b] - pct[a]);
  const trueTop4 = byArea.slice(0, 4);

  const evalStrategy = (set) => {
    const four = set.slice(0, 4);
    return {
      four,
      cover: +four.reduce((a, h) => a + (pct[h] || 0), 0).toFixed(3),
      fidel: four.filter((h) => trueTop4.includes(h)).length,
    };
  };
  const sData = evalStrategy(l1);
  const sHead4 = evalStrategy(l3);
  const sArea = evalStrategy(trueTop4);

  /* 主色裁决：**排除底色及其同族（ΔE<10）之后**，面积最大的那个。
   * 第一版只按「彩度≥0.08」筛，把纸色也算成了有彩色（S01 的 #EFE7D7 彩度 0.094 过关，
   * 于是"面积主色"变成纸色，30 案只有 10 案与 data.js 一致 —— 那个数是**我的定义有问题**，
   * 不是数据有问题）。主色的语义是「除底色外最占面积的有彩色」，所以必须先排除 bg 族。 */
  const bg = D[id].bg;
  const chromatic = byArea.filter((h) => {
    if (h === bg) return false;
    if (bg) {
      const d = dE(rgb2lab(hex2rgb(h)), rgb2lab(hex2rgb(bg)));
      if (d < 10) return false;        // 同族：底色的深浅档，不是主色
    }
    return chromaOf(h) >= 0.08;
  });
  const areaPrimary = chromatic[0] || null;

  rows.push({
    id, L1: l1, L3: l3, pct, trueTop4, byArea,
    strategy: { data: sData, head4: sHead4, area: sArea },
    primary: {
      L1: D[id].primary,
      L2_first: (JSON.parse(readFileSync(join(import.meta.dirname, '01-matrix.json'), 'utf8')).rows.find((r) => r.id === id).primary.L2 || [])[0] || null,
      areaPrimary,
      areaPrimaryPct: areaPrimary ? pct[areaPrimary] : null,
      L1_pct: D[id].primary ? pct[D[id].primary] : null,
      L1_is_area_primary: D[id].primary === areaPrimary,
      L1_chroma: D[id].primary ? chromaOf(D[id].primary) : null,
      areaPrimary_chroma: areaPrimary ? chromaOf(areaPrimary) : null,
      /* L3 第 1 位是纸色/底色（低彩度）的案 —— build-prompts.mjs:250-259 声称有 9 案 */
      L3_first_is_achromatic: chromaOf(l3[0]) < 0.08,
      L3_first_pct: pct[l3[0]] || 0,
    },
    measured_area_top1: byArea[0],
    bg_pct: bg ? (pct[bg] || 0) : null,
  });
}

/* ── 汇总 ─────────────────────────────────────────────────────── */
const sum = {
  n: rows.length,
  /* 覆盖率：三种策略 */
  meanCover: {
    data: +(rows.reduce((a, r) => a + r.strategy.data.cover, 0) / rows.length).toFixed(2),
    head4: +(rows.reduce((a, r) => a + r.strategy.head4.cover, 0) / rows.length).toFixed(2),
    area: +(rows.reduce((a, r) => a + r.strategy.area.cover, 0) / rows.length).toFixed(2),
  },
  /* 保真：4 个里有几个是真前 4 */
  meanFidel: {
    data: +(rows.reduce((a, r) => a + r.strategy.data.fidel, 0) / rows.length).toFixed(2),
    head4: +(rows.reduce((a, r) => a + r.strategy.head4.fidel, 0) / rows.length).toFixed(2),
    area: 4,
  },
  fidel4: {
    data: rows.filter((r) => r.strategy.data.fidel === 4).length,
    head4: rows.filter((r) => r.strategy.head4.fidel === 4).length,
  },
  head4_worse_than_data: rows.filter((r) => r.strategy.head4.fidel < r.strategy.data.fidel).map((r) => r.id),
  head4_better_than_data: rows.filter((r) => r.strategy.head4.fidel > r.strategy.data.fidel).map((r) => r.id),
  primary: {
    L1_eq_areaPrimary: rows.filter((r) => r.primary.L1_is_area_primary).length,
    L1_is_achromatic: rows.filter((r) => r.primary.L1_chroma !== null && r.primary.L1_chroma < 0.08).map((r) => r.id + ':' + r.primary.L1),
    L3_first_achromatic: rows.filter((r) => r.primary.L3_first_is_achromatic).length,
    L3_first_achromatic_ids: rows.filter((r) => r.primary.L3_first_is_achromatic).map((r) => r.id + ':' + r.L3[0] + '(' + r.primary.L3_first_pct + '%)'),
  },
};
writeJson('05-four-slot.json', { at: new Date().toISOString(), summary: sum, rows });

console.log('=== 05 只能画 4 个：哪种取法最接近真实 ===');
console.log('平均面积覆盖：data.js ' + sum.meanCover.data + '% · 取 L3 前 4 ' + sum.meanCover.head4 + '% · 按面积取前 4（上界）' + sum.meanCover.area + '%');
console.log('平均保真（4 个里有几个真在前 4）：data.js ' + sum.meanFidel.data + ' · L3 前 4 ' + sum.meanFidel.head4 + ' · 上界 4');
console.log('完全命中前 4 的案：data.js ' + sum.fidel4.data + '/30 · L3 前 4 ' + sum.fidel4.head4 + '/30');
console.log('L3 前 4 比 data.js 差：' + (sum.head4_worse_than_data.join(' ') || '无'));
console.log('L3 前 4 比 data.js 好：' + (sum.head4_better_than_data.join(' ') || '无'));
console.log('');
console.log('主色裁决（按实测面积，有彩色里面积最大的应当是主色）：');
console.log('  data.js 的 primary === 面积主色：' + sum.primary.L1_eq_areaPrimary + '/30');
console.log('  data.js 的 primary 是低彩度（灰/黑/白，不像主色）：' + sum.primary.L1_is_achromatic.length + ' 案 → ' + (sum.primary.L1_is_achromatic.join(' ') || '无'));
console.log('  L3 第 1 位是低彩度（纸色/底色占位）：' + sum.primary.L3_first_achromatic + '/30');
console.log('    ' + (sum.primary.L3_first_achromatic_ids.join(' ') || '无'));
console.log('');
console.log(mdTable(['案', 'data 四色覆盖%', '保真', 'L3前4覆盖%', '保真', '面积前4覆盖%', '主色', '面积主色', '一致'],
  rows.map((r) => [r.id, r.strategy.data.cover, r.strategy.data.fidel + '/4', r.strategy.head4.cover, r.strategy.head4.fidel + '/4',
    r.strategy.area.cover, r.primary.L1, r.primary.areaPrimary, r.primary.L1_is_area_primary ? '✓' : '✗'])));
console.log('');
console.log('→ deliverables/71-plan/facts/05-four-slot.json');
