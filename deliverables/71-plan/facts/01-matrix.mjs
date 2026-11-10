/**
 * 01 · 四层事实矩阵（30 案 × 8 字段，全量，不抽样）。
 *
 *   层 L0  规格原文       prototypes/_specs/Sxx.md      （带行号）
 *   层 L1  data.js        window.SCHEMES                ← _build/collect-schemes.mjs
 *   层 L2  dna-clean.json 直接 JSON                     ← _prompts/extract-dna.mjs → clean-dna.mjs
 *   层 L3  prompts.js     window.STYLE_PROMPTS.schemes  ← _prompts/build-prompts.mjs
 *
 * 每个字段都要先回答一个前置问题：**这四层里，这个字段到底在哪几层存在？**
 * 「不存在」和「存在但不等」是两种完全不同的结论，混在一起会让分歧表失真。
 * 所以先做一层「字段存在性普查」（layerMap），再逐字段比。
 *
 * 运行：node deliverables/71-plan/facts/01-matrix.mjs
 */
import { join } from 'node:path';
import {
  IDS, PROTO, DIR_OF, loadData, loadPrompts, loadDnaClean, parseSpec, readRoot, hexOf,
  paletteOfData, paletteOfPrompts, paletteOfDna, sameSet, sameSeq, jaccard, writeJson, mdTable,
  stripCopyTail,
} from './lib.mjs';

const data = loadData().rows;
const prompts = loadPrompts().doc.schemes;
const dna = loadDnaClean().rows;
const byId = (arr) => Object.fromEntries(arr.map((r) => [r.id, r]));
const D = byId(data), P = byId(prompts), C = byId(dna);
const specs = Object.fromEntries(IDS.map((id) => [id, parseSpec(id)]));

/* ── 字段存在性普查 ─────────────────────────────────────────────
 * 一个字段在某一层「存在」＝ 该层确实有独立承载它的值（不是从别处 derive 出来的空壳）。
 */
const FIELDS = ['palette', 'primary', 'fonts', 'bg', 'minItems', 'radius', 'shadow', 'lineWidths'];

const layerMap = {};
for (const f of FIELDS) {
  layerMap[f] = {
    L0_spec: IDS.filter((id) => {
      const s = specs[id];
      if (f === 'palette' || f === 'primary' || f === 'bg') return !!(s.fields['配色系统'] && s.fields['配色系统'].hexes.length);
      if (f === 'fonts') return !!s.fields['字体策略'];
      if (f === 'radius') return /radius|圆角|直角/.test((s.fields['配色系统'] || {}).text || '') || /圆角|直角/.test((s.fields['去 AI 味审查点'] || {}).text || '');
      if (f === 'shadow') return /投影|阴影/.test(Object.values(s.fields).map((x) => x.text).join(' '));
      if (f === 'lineWidths') return /线宽/.test(Object.values(s.fields).map((x) => x.text).join(' '));
      if (f === 'minItems') return false;   // 规格里没有「条目数」这个字段
      return false;
    }).length,
    L1_data: IDS.filter((id) => {
      if (f === 'palette') return (D[id].palette || []).length > 0;
      if (f === 'primary') return !!D[id].primary;
      if (f === 'fonts') return !!D[id].fonts;
      if (f === 'bg') return !!D[id].bg;
      return false;   // data.js 没有 minItems / radius / shadow / lineWidths
    }).length,
    L2_dna: IDS.filter((id) => {
      if (f === 'palette') return (C[id].palette || []).length > 0;
      if (f === 'primary') return (C[id].primary || []).length > 0;
      if (f === 'fonts') return !!(C[id].fonts && (C[id].fonts.display || C[id].fonts.body));
      if (f === 'radius') return !!C[id].radius;
      if (f === 'shadow') return !!C[id].shadow;
      if (f === 'lineWidths') return !!C[id].lineWidths;
      return false;
    }).length,
    L3_prompts: IDS.filter((id) => {
      if (f === 'palette') return !!P[id].dna.palette;
      if (f === 'primary') return !!P[id].dna.primary;
      if (f === 'fonts') return !!(P[id].dna.fonts && (P[id].dna.fonts.display || P[id].dna.fonts.body));
      if (f === 'minItems') return typeof P[id].minItems === 'number';
      if (f === 'radius') return !!P[id].dna.radius;
      if (f === 'shadow') return !!P[id].dna.shadow;
      if (f === 'lineWidths') return !!P[id].dna.lineWidths;
      return false;
    }).length,
    L3_note: '',
  };
}
layerMap.bg.L0_spec = IDS.filter((id) => /背景|底色/.test((specs[id].fields['配色系统'] || {}).text || '')).length;
layerMap.primary.L0_spec = IDS.filter((id) => /主色/.test((specs[id].fields['配色系统'] || {}).text || '')).length;
layerMap.minItems.L3_note = '只有 prompts.js 有（来自 minitems-parsed.json 实测 + build-prompts.mjs 的 HUMAN 兜底）';
layerMap.bg.L3_note = 'prompts.js 的 dna 里**没有** bg 字段（只有 palette 第 1 项隐含底色）';

/* ── 逐字段落地 ─────────────────────────────────────────────── */
const rows = [];

for (const id of IDS) {
  const spec = specs[id];
  const p3 = spec.fields['配色系统'] || { text: '', startLine: 0, endLine: 0, hexes: [] };
  const p4 = spec.fields['字体策略'] || { text: '', startLine: 0, endLine: 0 };
  const root = readRoot(id);

  const l1 = paletteOfData(D[id].palette);
  const l2 = paletteOfDna(C[id].palette);
  const l3 = paletteOfPrompts(P[id].dna.palette);

  /* L0 的「配色」原话里，第 1 个带角色标签的色 + 主色标注。
   * 注意：规格原文里混着反例色（「反的是 #6366F1」），所以原话只作**意图证据**，
   * 不加任何过滤地拿来跟 L1/L3 比会得出错误结论（见 02-palette 的 NEG 复算）。 */
  const row = {
    id,
    specLine: { p3: p3.startLine + '-' + p3.endLine, p4: p4.startLine + '-' + p4.endLine },
    // ---- palette ----
    palette: {
      L0_hexes: p3.hexes,
      L1: l1, L2: l2, L3: l3,
      L1_len: l1.length, L3_len: l3.length,
      L2_eq_L3: sameSeq(l2, l3),
      set_L1_sub_L3: l1.every((h) => l3.includes(h)),
      set_L3_sub_L1: l3.every((h) => l1.includes(h)),
      set_eq: sameSet(l1, l3),
      seq_eq: sameSeq(l1, l3),
      jaccard: jaccard(l1, l3),
      L3_only: l3.filter((h) => !l1.includes(h)),
      L1_only: l1.filter((h) => !l3.includes(h)),
      L0_not_in_L1: p3.hexes.filter((h) => !l1.includes(h)),
      L0_not_in_L3: p3.hexes.filter((h) => !l3.includes(h)),
    },
    // ---- primary ----
    primary: {
      L1: D[id].primary || null,
      L2: (C[id].primary || []).slice(),
      /* prompts.js 的 dna 里到底有没有 primary 这个键 —— 直接查键，不查值。
       * build-prompts.mjs:296-309 的组装里只搬了 palette/fonts/radius/shadow/lineWidths，
       * 没有 primary。这是**结构性缺席**，不是值为空。 */
      L3: Object.prototype.hasOwnProperty.call(P[id].dna, 'primary') ? P[id].dna.primary : null,
      L3_key_present: Object.prototype.hasOwnProperty.call(P[id].dna, 'primary'),
      L0_has_role: /主色/.test(p3.text),
    },
    // ---- fonts ----
    fonts: {
      L0_kind: 'string',
      L1_kind: typeof D[id].fonts,
      L1_len: String(D[id].fonts || '').length,
      L2_kind: C[id].fonts ? 'object' : 'none',
      L3_kind: P[id].dna.fonts ? 'object' : 'none',
      L2: C[id].fonts || null,
      L3_eq_L2: JSON.stringify(C[id].fonts) === JSON.stringify(P[id].dna.fonts),
      // 规格原文里点名的字体族（用反引号/顿号切，只取「字体名」候选）
      L0_families: [...new Set((p4.text.match(/`([^`]{2,40})`/g) || []).map((s) => s.replace(/`/g, ''))
        .filter((s) => /^[A-Za-z][A-Za-z0-9 .\-]*$/.test(s)))],
    },
    // ---- bg ----
    bg: {
      L1: D[id].bg || null,
      L2_via_palette0: l2[0] || null,
      L3_via_palette0: l3[0] || null,
      L0_firstHex: p3.hexes[0] || null,
      root_has_paper: root.declarations.some((d) => /paper|bg|ground|base/i.test(d.name)),
    },
    // ---- minItems ----
    minItems: {
      L1: undefined, L2: undefined,
      L3: P[id].minItems,
      L3_capacity: P[id].capacity ? P[id].capacity.minItems : null,
      L3_minPics: P[id].minPics,
    },
    // ---- radius / shadow / lineWidths ----
    radius: { L1: undefined, L2: C[id].radius, L3: P[id].dna.radius, L0: /圆角|直角/.test(p3.text + ' ' + ((spec.fields['去 AI 味审查点'] || {}).text || '')) },
    shadow: { L1: undefined, L2: C[id].shadow, L3: P[id].dna.shadow, L0: /投影|阴影/.test(Object.values(spec.fields).map((x) => x.text).join(' ')) },
    lineWidths: { L1: undefined, L2: C[id].lineWidths, L3: P[id].dna.lineWidths, L0: /线宽/.test(Object.values(spec.fields).map((x) => x.text).join(' ')) },
    // ---- :root 直测（第五个参照：不是四层之一，是**地面真相**的候选） ----
    root: {
      hasRoot: root.hasRoot,
      n: root.declarations.length,
      hexes: [...new Set(root.declarations.map((d) => hexOf(d.value)).filter(Boolean))],
      families: root.declarations.filter((d) => /font|f-|text|display|mono|cn|cjk|latin/i.test(d.name)).map((d) => d.name + '=' + d.value.slice(0, 60)),
    },
  };
  row.radius.L2_eq_L3 = row.radius.L2 === row.radius.L3;
  row.shadow.L2_eq_L3 = row.shadow.L2 === row.shadow.L3;
  row.lineWidths.L2_eq_L3 = row.lineWidths.L2 === row.lineWidths.L3;
  rows.push(row);
}

/* ── 汇总结论（这些数字要进报告正文） ─────────────────────────── */
const sum = {
  palette: {
    set_eq: rows.filter((r) => r.palette.set_eq).length,
    seq_eq: rows.filter((r) => r.palette.seq_eq).length,
    seq_diff: rows.filter((r) => !r.palette.seq_eq).length,
    L2_eq_L3: rows.filter((r) => r.palette.L2_eq_L3).length,
    L1_sub_L3: rows.filter((r) => r.palette.set_L1_sub_L3).length,
    L3_sub_L1: rows.filter((r) => r.palette.set_L3_sub_L1).length,
    L1_len_hist: rows.reduce((a, r) => (a[r.palette.L1_len] = (a[r.palette.L1_len] || 0) + 1, a), {}),
    L3_len_hist: rows.reduce((a, r) => (a[r.palette.L3_len] = (a[r.palette.L3_len] || 0) + 1, a), {}),
    mean_jaccard: +(rows.reduce((a, r) => a + r.palette.jaccard, 0) / rows.length).toFixed(4),
    L1_sub_L3_ids: rows.filter((r) => r.palette.set_L1_sub_L3).map((r) => r.id),
    L1_not_sub_L3_ids: rows.filter((r) => !r.palette.set_L1_sub_L3).map((r) => r.id + '[' + r.palette.L1_only.join(',') + ']'),
  },
  primary: {
    /* ⚠️ 自我纠错：第一版写的是 `r.primary.L3 !== undefined`，但 L3 取的是 `|| null`，
     * null !== undefined 恒真 → 报出「30/30 有 primary」，而事实是 prompts.js 的 dna **根本没有这个键**。
     * 改成直接问「键存不存在」。 */
    L3_present: rows.filter((r) => r.primary.L3_key_present).length,
    L2_present: rows.filter((r) => r.primary.L2.length > 0).length,
    L1_eq_L2_0: rows.filter((r) => r.primary.L1 && r.primary.L2[0] === r.primary.L1).length,
    L2_empty: rows.filter((r) => r.primary.L2.length === 0).length,
    L1_eq_L1_palette1: rows.filter((r) => r.primary.L1 === r.palette.L1[1]).length,
    L0_has_role: rows.filter((r) => r.primary.L0_has_role).length,
    L2_multi: rows.filter((r) => r.primary.L2.length > 1).map((r) => r.id + ':' + r.primary.L2.length),
  },
  fonts: {
    L1_string: rows.filter((r) => r.fonts.L1_kind === 'string').length,
    L2_object: rows.filter((r) => r.fonts.L2_kind === 'object').length,
    L2_eq_L3: rows.filter((r) => r.fonts.L3_eq_L2).length,
    L2_missing_display: rows.filter((r) => r.fonts.L2 && !r.fonts.L2.display).length,
  },
  bg: {
    L1_eq_L2_p0: rows.filter((r) => r.bg.L1 === r.bg.L2_via_palette0).length,
    L1_eq_L3_p0: rows.filter((r) => r.bg.L1 === r.bg.L3_via_palette0).length,
    L1_eq_L0_first: rows.filter((r) => r.bg.L1 === r.bg.L0_firstHex).length,
    root_has_paper: rows.filter((r) => r.bg.root_has_paper).length,
  },
  minItems: {
    L1: rows.filter((r) => r.minItems.L1 !== undefined).length,
    L2: rows.filter((r) => r.minItems.L2 !== undefined).length,
    L3: rows.filter((r) => r.minItems.L3 !== undefined).length,
    capacity_differs: rows.filter((r) => r.minItems.L3 !== r.minItems.L3_capacity).map((r) => r.id + ':' + r.minItems.L3 + 'vs' + r.minItems.L3_capacity),
  },
  radiusShadowLines: {
    radius_L2_eq_L3: rows.filter((r) => r.radius.L2_eq_L3).length,
    shadow_L2_eq_L3: rows.filter((r) => r.shadow.L2_eq_L3).length,
    lineWidths_L2_eq_L3: rows.filter((r) => r.lineWidths.L2_eq_L3).length,
    radius_L0_mentioned: rows.filter((r) => r.radius.L0).length,
    shadow_L0_mentioned: rows.filter((r) => r.shadow.L0).length,
    lineWidths_L0_mentioned: rows.filter((r) => r.lineWidths.L0).length,
  },
};

const out = { at: new Date().toISOString(), layerMap, summary: sum, rows };
writeJson('01-matrix.json', out);

/* ── 终端输出 ─────────────────────────────────────────────────── */
console.log('=== 01 四层矩阵 ===');
console.log('\n[字段存在性] 每层各有多少案真的承载了这个字段（/30）');
console.log(mdTable(['字段', 'L0 规格', 'L1 data.js', 'L2 dna-clean', 'L3 prompts.js', '备注'],
  FIELDS.map((f) => [f, layerMap[f].L0_spec, layerMap[f].L1_data, layerMap[f].L2_dna, layerMap[f].L3_prompts, layerMap[f].L3_note])));

console.log('\n[palette] L1(3–4 色) vs L3(4–7 色)');
console.log('  长度分布 L1=' + JSON.stringify(sum.palette.L1_len_hist) + '  L3=' + JSON.stringify(sum.palette.L3_len_hist));
console.log('  集合相同 ' + sum.palette.set_eq + '/30 · 顺序相同 ' + sum.palette.seq_eq + '/30 · 平均 Jaccard ' + sum.palette.mean_jaccard);
console.log('  L1 是 L3 的子集：' + sum.palette.L1_sub_L3 + '/30');
if (sum.palette.L1_not_sub_L3_ids.length) console.log('  不是子集的案：' + sum.palette.L1_not_sub_L3_ids.join(' '));
console.log('  L2 === L3 逐序：' + sum.palette.L2_eq_L3 + '/30（证明 prompts.js 的 palette 未被二次加工）');

console.log('\n[primary]');
console.log('  L3 有 primary 字段的案：' + sum.primary.L3_present + '/30');
console.log('  L2 primary 为空数组的案：' + sum.primary.L2_empty + '/30');
console.log('  L1.primary === L1.palette[1]：' + sum.primary.L1_eq_L1_palette1 + '/30（构造不变量）');
console.log('  L1.primary === L2.primary[0]：' + sum.primary.L1_eq_L2_0 + '/30');
console.log('  规格字段 3 里出现「主色」二字：' + sum.primary.L0_has_role + '/30');

console.log('\n[fonts]');
console.log('  L1 是字符串：' + sum.fonts.L1_string + '/30 · L2/L3 是对象：' + sum.fonts.L2_object + '/30');
console.log('  L2 === L3（整对象）：' + sum.fonts.L2_eq_L3 + '/30');

console.log('\n[bg]');
console.log('  L1.bg === L2.palette[0]：' + sum.bg.L1_eq_L2_p0 + '/30 · === L3.palette[0]：' + sum.bg.L1_eq_L3_p0 + '/30');
console.log('  L1.bg === 规格字段 3 的第一个 hex：' + sum.bg.L1_eq_L0_first + '/30');
console.log('  :root 里有 paper/bg 类变量：' + sum.bg.root_has_paper + '/30');

console.log('\n[minItems]');
console.log('  L1=' + sum.minItems.L1 + ' L2=' + sum.minItems.L2 + ' L3=' + sum.minItems.L3 + ' 案有该字段');
if (sum.minItems.capacity_differs.length) console.log('  s.minItems !== s.capacity.minItems：' + sum.minItems.capacity_differs.join(' '));

console.log('\n[radius / shadow / lineWidths]');
console.log('  L2===L3：radius ' + sum.radiusShadowLines.radius_L2_eq_L3 + '/30 · shadow ' + sum.radiusShadowLines.shadow_L2_eq_L3 + '/30 · lineWidths ' + sum.radiusShadowLines.lineWidths_L2_eq_L3 + '/30');
console.log('  规格原文提到：radius ' + sum.radiusShadowLines.radius_L0_mentioned + '/30 · shadow ' + sum.radiusShadowLines.shadow_L0_mentioned + '/30 · lineWidths ' + sum.radiusShadowLines.lineWidths_L0_mentioned + '/30');

console.log('\n→ deliverables/71-plan/facts/01-matrix.json');
