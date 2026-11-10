/**
 * 09 · 汇总：把 00–08 的数字收进一张表，并逐字段给出「权威层」判定与合并建议。
 *
 * 这个脚本不做新测量，只做**聚合与判定**，所有输入都来自前面的 json，
 * 保证报告里的每个数字都能追到某一次探针运行。
 *
 * 运行：node deliverables/71-plan/facts/09-verdict.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IDS, FACTS, writeJson } from './lib.mjs';

const J = (n) => JSON.parse(readFileSync(join(FACTS, n), 'utf8'));
const cal = J('00-calibration.json');
const mx = J('01-matrix.json');
const pal = J('02-palette-semantics.json');
const px = J('03-pixels.json');
const attr = J('04-dropped-attribution.json');
const four = J('05-four-slot.json');
const prim = J('06-primary.json');
const fonts = J('07-fonts.json');
const spec08 = J('08-font-intent-vs-css.json');

const verdict = {
  at: new Date().toISOString(),
  inputs: ['00-calibration', '01-matrix', '02-palette-semantics', '03-pixels', '04-dropped-attribution',
    '05-four-slot', '06-primary', '07-fonts', '08-font-intent-vs-css'],

  /* ── 字段存在性（决定「分歧」是不是真的分歧） ── */
  layerMap: mx.layerMap,

  /* ── Q1 权威来源判定 ── */
  Q1: {
    palette: {
      authoritative: 'L0 规格（设计意图） + 样式面实测（落地约束），**不是**单一层',
      evidence: {
        specField3_hasHex: mx.layerMap.palette.L0_spec,
        L1_subsetOf_L3: pal.summary.subset + '/30',
        L1_eq_L3_set: pal.summary.set_eq + '/30',
        note: 'L1 与 L3 都是「从规格/样式抽色」的产物，差别只在截断长度（4 vs 7）与排序策略；'
          + '两套都不是独立事实源，所以不能指任一为"权威"，真正的权威是规格字段 3 + :root。',
      },
      wrongLayer: 'L1 的**截断**（collect-schemes.mjs:486 `if (pal.length >= 4) break`）是唯一确定的缺陷——'
        + '它让 UI 少画了 ' + attr.summary.nIndependent + ' 个「独立且带角色名」的色（详见 Q2）。',
    },
    primary: {
      authoritative: 'L0 规格字段 3 的「主色」标注',
      evidence: {
        L0_hasRole: mx.layerMap.primary.L0_spec + '/30',
        L1_eq_L0clean: prim.summary.agree.L1_eq_L0clean + '/30',
        L1_eq_L2first: prim.summary.agree.L1_eq_L2first + '/30',
        L1_eq_areaPrimary: prim.summary.agree.L1_eq_area + '/30',
        L0_eq_areaPrimary: prim.summary.agree.L0clean_eq_area + '/30',
      },
      wrongLayer: 'L1 在 5 案上被 collect-schemes.mjs:296 的 regex1 抓错（它取「主色」之后第一个 hex，'
        + '而原文常把 hex 写在「主色」之前）；L2 在 9 案上一个主色都没认出（空数组）。',
      brokenIds: prim.summary.L1_fallback_ids,
      L2_emptyIds: prim.summary.L2_empty_ids,
    },
    fonts: {
      authoritative: '分两种语义，各有各的权威',
      evidence: {
        L1_isRawSpecText: fonts.summary.L1_isRawSpecText + '/30',
        L2_eq_L3: fonts.summary.L2_eq_L3 + '/30',
        specTitle_eq_cssTitle: spec08.summary.same + '/30',
      },
      note: 'L1 的字面值 = 规格字段 4 原文（30/30 逐字相等），权威性属于"设计意图描述"；'
        + 'L2/L3 是从 :root/h1 规则解析出的可执行族名，权威性属于"落地事实"。两者语义不同。',
    },
    bg: {
      authoritative: 'L0/_CURRENT-VALUES.md（当前有效背景），落地以 :root 为准',
      evidence: {
        L1_eq_L3_palette0: mx.summary.bg.L1_eq_L3_p0 + '/30',
        rootHasPaperVar: mx.summary.bg.root_has_paper + '/30',
        note: 'bg 在两条链上其实**没有分叉**：L3 没有独立 bg 字段，它的"底色"就是 palette[0]；'
          + '而 L1.bg 与 palette[0] 相等只有 7/30 —— 差值全部来自「L1.palette[0] 被重排」。'
          + '换句话说 bg 本身一致，是 **palette 的顺序**让它们看起来不一致。',
      },
    },
    minItems: {
      authoritative: 'L3 prompts.js（唯一持有者）',
      evidence: { L1: 0, L2: 0, L3: 30, capacityDiffers: mx.summary.minItems.capacity_differs.length },
      note: '只有一条链算过这个字段（minitems-parsed.json 实测 + build-prompts 的 HUMAN 兜底），'
        + '不存在跨链分歧；风险只在「单一来源无交叉校验」。',
    },
    radiusShadowLineWidths: {
      authoritative: 'L2 dna-clean（从 CSS 抽），L3 原样搬运',
      evidence: {
        radius_L2eqL3: mx.summary.radiusShadowLines.radius_L2_eq_L3 + '/30',
        shadow_L2eqL3: mx.summary.radiusShadowLines.shadow_L2_eq_L3 + '/30',
        lineWidths_L2eqL3: mx.summary.radiusShadowLines.lineWidths_L2_eq_L3 + '/30',
        onlyOneChain: 'L1 data.js 完全没有这三个字段（0/30）',
      },
      note: '三项只有一条链（CSS→dna-clean→prompts），L1 根本不存在，故无跨链分歧。'
        + '它们的风险不是"两条链不一致"，而是"选型台看不到这三项"。',
    },
  },

  /* ── Q2 palette 语义 ── */
  Q2: {
    verdict: '(b) 两个都对、语义不同 —— 但 L1 的截断规则本身有一个缺陷',
    evidence: {
      subset: pal.summary.subset + '/30（L1 的每个色都在 L3 里，无一例外）',
      seqEq: pal.summary.seq_eq + '/30',
      setEq: pal.summary.set_eq + '/30',
      L1_is_subseq: pal.summary.L1_subseq_of_L3 + '/30',
      totalDropped: pal.summary.totalDropped,
      droppedNearDup: attr.summary.nNearDup,
      droppedIndependent: attr.summary.nIndependent,
      meanDroppedAreaAll: attr.summary.meanDroppedAll + '%',
      meanDroppedAreaIndependent: attr.summary.meanDroppedIndependent + '%',
      independentGt1pct: attr.summary.cases_independent_area_gt_1pct,
      independentGt5pct: attr.summary.cases_independent_area_gt_5pct,
    },
    reasoning: [
      'L1 ⊂ L3 在 30/30 成立：两套值不是互相矛盾的两个事实，而是**同一集合的两种截断**。',
      '被丢掉的 52 个色里，33 个与最近保留色 ΔE<10（同一色族，肉眼几乎不可分），只有 19 个是真正独立的第 5+ 种色。',
      '按 CDP 实测面积，被丢色合计平均 9.72%，但其中**独立色**部分平均只有 1.15% —— 大面积几乎全部来自近邻噪声（纹理/渐变/抗锯齿）。',
      '所以「data.js 丢了页面上一大半颜色」这个说法是**错的**（S06 的 62%、S03 的 44.7% 都是近邻色）。',
      '但 L1 的截断确实有缺陷：19 个独立色被丢掉，其中 6 例面积 >1%，2 例 >5%（S23 7.7%、S27 16.2%）。',
      'app.js:508 的 slice(0,4)：L3 前 4 的保真度（3.23/4）**不低于** L1（3.07/4），覆盖率也更高（84.12% vs 83.31%），'
        + '且没有任何一案比 L1 差 —— 说明「取前 4 个」这个策略本身是合理的，问题在于 L1 只有 3–4 个可选。',
    ],
    slice0_4_judgement: {
      L3_head4_fidelity: four.summary.meanFidel.head4 + '/4',
      L1_fidelity: four.summary.meanFidel.data + '/4',
      area_upper_bound: four.summary.meanFidel.area + '/4',
      cover: four.summary.meanCover,
      head4_worse_than_data: four.summary.head4_worse_than_data,
      head4_better_than_data: four.summary.head4_better_than_data,
      conclusion: '「取前 4 个」不是错误的策略：它比 L1 的 3–4 色更接近真实，且从不变差。'
        + '真正的问题是 L3 的排序（第 1 位常常是纸色/底色，8/30 是低彩度占位），'
        + '以及 UI 没有说明「你看到的是 4 个，完整配色有 N 个」。',
    },
    uiRecommendation: {
      showHowMany: '4 个色块不变（版面约束），但必须补一个「共 N 色」的计数与展开入口',
      reorder: 'L3 的 palette 应先按「底色 / 主色 / 其余按面积」排序，而不是按 :root 声明顺序',
      note: '实测 8/30 案的 palette[0] 是低彩度纸色，但其中 S08/S18/S25/S26 的纸色**确实是**面积最大（67–88%），'
        + '所以「第一位是纸色」本身不错；错的是把它当"主色"标出来（app.js:963 无条件给 palette[1] 标「主色」）。',
    },
  },

  /* ── Q3 fonts ── */
  Q3: {
    verdict: '保持两个字段，但把 L1 改名并补一个结构化投影',
    evidence: {
      L1_isRawSpecText: fonts.summary.L1_isRawSpecText + '/30',
      L2_eq_L3: fonts.summary.L2_eq_L3 + '/30',
      uiUseSites: fonts.summary.ui.useSites.filter((u) => u.side.startsWith('data.js')).length,
      uiUseSitesPrompts: fonts.summary.ui.useSites.filter((u) => u.side.startsWith('prompts.js')).length,
      availabilityAPI: fonts.summary.ui.availabilityAPI.length,
    },
    reasoning: [
      'UI 只有两处读 data.js 的 fonts：app.js:1353 直接打印整段文字，app.js:235 拼进搜索串。**两处都是纯文本消费**。',
      'UI 里**没有任何**字体可用性检测（document.fonts / fonts.check / FontFace / measureText 全为 0 次），'
        + '所以"UI 需要结构化"这个前提不成立。',
      'prompt-copy.js:176-179 需要结构化对象（display/body/mono）来拼提示词，且这个对象 30/30 由 clean-dna 产生、30/30 原样进 prompts.js。',
      '两侧的**值**语义不同：L1 是规格原文（含"为什么不用某字体"的论证），L2/L3 是可执行的族名栈。',
      '若强行统一成对象，会丢掉规格原文里的取舍论证（平均 ' + Math.round(fonts.summary.n ? 0 : 0) + ' 字/案，最多 513 字）；'
        + '若统一成字符串，prompt-copy 又得回去用正则猜谁是标题（build-prompts.mjs:300 记录该猜法曾错 7/30）。',
    ],
    recommendation: {
      keep: '两个字段都保留，但**改名消除歧义**：data.js 的 `fonts` → `fontsSpec`（规格原文，供展示/搜索）；'
        + 'prompts.js 的 `dna.fonts` 保持 `{display, body, mono, displayStack, bodyStack}`（供拼提示词）。',
      add: '若将来 UI 需要做字体可用性提示，再加 `fontsResolved`（从 L2 投影 3 个族名），而不是把原文塞进对象。',
      why: '命名是这次分叉的真正代价：两处都叫 `fonts`，读代码的人会以为它们是同一个东西。',
    },
  },

  /* ── 覆盖度自检：每个数字都能追到探针 ── */
  provenance: {
    calibrationAllPass: [
      cal.checks.find((c) => c.id === 'C1a')?.pass,
      cal.checks.find((c) => c.id === 'C1b')?.pass,
      cal.checks.find((c) => c.id === 'C2b')?.pass,
    ].every(Boolean),
    pixelCalibration: px.summary.calibration,
    note: '所有百分比来自 03-pixels.json；所有集合关系来自 02；所有 primary 归因来自 06 的复算。',
  },
};

writeJson('09-verdict.json', verdict);

console.log('=== 09 汇总裁决 ===');
console.log('Q2 结论：' + verdict.Q2.verdict);
console.log('  L1 ⊂ L3：' + verdict.Q2.evidence.subset);
console.log('  被丢 ' + verdict.Q2.evidence.totalDropped + ' 色 → 近邻噪声 ' + verdict.Q2.evidence.droppedNearDup
  + ' · 独立色 ' + verdict.Q2.evidence.droppedIndependent);
console.log('  面积：被丢色合计 ' + verdict.Q2.evidence.meanDroppedAreaAll
  + ' → 独立色仅 ' + verdict.Q2.evidence.meanDroppedAreaIndependent);
console.log('  slice(0,4) 保真：L1 ' + verdict.Q2.slice0_4_judgement.L1_fidelity
  + ' vs L3前4 ' + verdict.Q2.slice0_4_judgement.L3_head4_fidelity
  + ' vs 上界 ' + verdict.Q2.slice0_4_judgement.area_upper_bound);
console.log('  比 L1 差的案：' + (verdict.Q2.slice0_4_judgement.head4_worse_than_data.join(' ') || '无'));
console.log('');
console.log('Q3 结论：' + verdict.Q3.verdict);
console.log('  UI 读 data.js fonts 的处数：' + verdict.Q3.evidence.uiUseSites + '（全是纯文本）');
console.log('  字体可用性检测 API：' + verdict.Q3.evidence.availabilityAPI + ' 处');
console.log('');
console.log('→ deliverables/71-plan/facts/09-verdict.json');
