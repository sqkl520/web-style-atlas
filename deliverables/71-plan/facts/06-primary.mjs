/**
 * 06 · primary 的三层比对 + 「哪一层是对的」裁决。
 *
 * primary 在这四条链上有**三个不同的来源**，这是全仓最容易混淆的字段：
 *   L1 data.js      ← _CURRENT-VALUES.md 的「主色」那一格（有则用），否则字段 3 的「主色」正则，
 *                      再否则 collect-schemes.mjs:493 兜底成 palette[1]
 *   L2 dna-clean    ← clean-dna.mjs:1002 pickPalette()，判据是 :root 注释/变量名/文件头散文，
 *                      产出的是**数组**（可能 0 个、可能多个）
 *   L3 prompts.js   ← **没有这个键**（build-prompts.mjs 组装时没搬）
 *   L0 规格原文     ← 字段 3 里「主色」二字后面那个 hex（但也可能写在前面，也可能被否定语境带走）
 *
 * 裁决办法不靠"哪边看起来更专业"，而用**渲染面积**这个第三方事实：
 * 主色的语义 = 「除底色外最占面积的有彩色」。谁最接近这个，谁就是对的。
 *
 * 运行：node deliverables/71-plan/facts/06-primary.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  IDS, ROOT, loadData, loadPrompts, loadDnaClean, parseSpec, readRoot, hexOf,
  paletteOfData, paletteOfPrompts, writeJson, mdTable,
} from './lib.mjs';

const D = Object.fromEntries(loadData().rows.map((r) => [r.id, r]));
const P = Object.fromEntries(loadPrompts().doc.schemes.map((r) => [r.id, r]));
const C = Object.fromEntries(loadDnaClean().rows.map((r) => [r.id, r]));
const matrix = JSON.parse(readFileSync(join(import.meta.dirname, '01-matrix.json'), 'utf8'));
const mx = Object.fromEntries(matrix.rows.map((r) => [r.id, r]));
const pixels = JSON.parse(readFileSync(join(import.meta.dirname, '03-pixels.json'), 'utf8'));
const px = Object.fromEntries(pixels.rows.filter((r) => !r.error).map((r) => [r.id, r]));

const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const chromaOf = (h) => { const [r, g, b] = hex2rgb(h).map((v) => v / 255); return +(Math.max(r, g, b) - Math.min(r, g, b)).toFixed(3); };
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

/* L0：规格字段 3 里的「主色」判定，独立实现。
 *
 * ⚠️ 自我纠错（第一版写错过，很值得记）：第一版先找 `主色` **后面**的 hex，找不到才看前面。
 * 结果 S01 取到 #EFE7D7（背景），因为原文是
 *   `` `#C1121F` 朱红专色＝主色，14%；`#EFE7D7` 未漂白新闻纸＝背景 `` ——
 * 主色那个 hex 在**前面**，而"后面 40 字内"确实也有一个 hex（下一句的背景色），于是错抓。
 * 正确判据是**按距离取最近的那个 hex**，不分前后。两种写法都存在：
 *   前式 `#C1121F 朱红＝主色`（S01/S08/S21…）
 *   后式 `主色 #1B4A4A（…）`（S11/S13…）
 * 所以必须双边比距离，不能定死优先顺序。
 */
const NEG = /(反的是|反对|反「|不是|而非|既不|也不|不采用|不选|不取|不用|不使用|不要|不得|禁止|排除|避免|回避|拒绝|剔除|禁用|离开|远离)/;
function primaryFromSpec(text) {
  const hits = [];
  const re = /主色/g;
  let m;
  while ((m = re.exec(text))) {
    // 同分句内、向前向后各 34 字的所有 hex，按与「主色」二字的最小距离排序
    const backWin = text.slice(Math.max(0, m.index - 34), m.index);
    const fwdWin = text.slice(m.index, m.index + 34);
    const cands = [];
    for (const mm of backWin.matchAll(/#[0-9A-Fa-f]{6}/g)) {
      cands.push({ hex: mm[0].toUpperCase(), dist: backWin.length - (mm.index + mm[0].length) });
    }
    for (const mm of fwdWin.matchAll(/#[0-9A-Fa-f]{6}/g)) {
      cands.push({ hex: mm[0].toUpperCase(), dist: mm.index });
    }
    if (!cands.length) continue;
    cands.sort((a, b) => a.dist - b.dist);
    const h = cands[0].hex;
    const ctx = text.slice(Math.max(0, m.index - 40), m.index + 60);
    hits.push({ hex: h, dist: cands[0].dist, negated: NEG.test(ctx), ctx: ctx.replace(/\s+/g, ' ') });
  }
  return hits;
}

/* _CURRENT-VALUES.md 的「主色（当前）」那一格 —— 这是 L1 的**第一优先来源**
 * （collect-schemes.mjs:126-133）。独立解析一遍，不依赖 data.js 的结果。 */
const curPrimary = (() => {
  const t = readFileSync(join(ROOT, 'prototypes', '_specs', '_CURRENT-VALUES.md'), 'utf8');
  const out = {};
  for (const line of t.split(/\r?\n/)) {
    const m = /^\|\s*\*\*(S\d{2})\*\*\s*([^|]*)\|([^|]*)\|([^|]*)\|/.exec(line);
    if (!m) continue;
    const primCell = m[4];                       // 第 4 格 = 主色（当前）
    const h = (/#[0-9A-Fa-f]{6}/.exec(primCell) || [])[0];
    // "见 _specs/Sxx.md" 这类写法表示"没有独立值，回字段 3"
    out[m[1]] = h ? h.toUpperCase() : null;
  }
  return out;
})();

const rows = [];
for (const id of IDS) {
  const p3 = (parseSpec(id).fields['配色系统'] || {}).text || '';
  const specHits = primaryFromSpec(p3);
  const specFirst = specHits.length ? specHits[0].hex : null;
  const specFirstClean = specHits.find((h) => !h.negated) ? specHits.find((h) => !h.negated).hex : null;

  const bg = D[id].bg;
  const pct = px[id] ? px[id].pct : {};
  const byArea = Object.keys(pct).sort((a, b) => pct[b] - pct[a]);
  // 面积主色：排除 bg 及其同族（ΔE<10）后，面积最大的有彩色
  const areaPrimary = byArea.filter((h) => {
    if (h === bg) return false;
    if (bg && dE(rgb2lab(hex2rgb(h)), rgb2lab(hex2rgb(bg))) < 10) return false;
    return chromaOf(h) >= 0.08;
  })[0] || null;

  const l1 = D[id].primary;
  const l2 = (C[id].primary || []);
  const l3key = Object.prototype.hasOwnProperty.call(P[id].dna, 'primary');

  rows.push({
    id,
    L0_raw: specFirst, L0_clean: specFirstClean, L0_hits: specHits,
    L1: l1, L2: l2, L3_key: l3key,
    areaPrimary,
    pct: { L1: l1 ? (pct[l1] || 0) : null, L0_raw: specFirst ? (pct[specFirst] || 0) : null, area: areaPrimary ? (pct[areaPrimary] || 0) : null },
    agree: {
      L1_eq_L0clean: !!(l1 && specFirstClean && l1 === specFirstClean),
      L1_eq_L2first: !!(l1 && l2[0] && l1 === l2[0]),
      L1_eq_area: !!(l1 && areaPrimary && l1 === areaPrimary),
      L0clean_eq_area: !!(specFirstClean && areaPrimary && specFirstClean === areaPrimary),
      L2first_eq_area: !!(l2[0] && areaPrimary && l2[0] === areaPrimary),
    },
    /* L1 的来源归因：**忠实复算** collect-schemes.mjs:296-298 的三条正则 + :493 的兜底，
     * 而不是看"结果是否等于 pal[1]"去猜。
     * 第一版就是这么猜的，于是 S02/S05/S07/S09/S10 全被标成"兜底"，而实测它们是
     * **regex1 抓错**：`/主色[^#\n]{0,24}(#hex)/` 取的是「主色」**后面**第一个 hex，
     * 而 S02 原文是 `` `#B8860B` 暗金＝主色与纹样 ``（主色在 hex 之后），
     * regex1 于是抓到下一个色 #EFE6D0（正文色）。它恰好等于 pal[1]，但**不是兜底产生的**。
     * 归因错了会直接导致"修哪一层"的判断错，所以必须复算而不是猜。 */
    L1_reason: (() => {
      const p3text = p3;
      const r1 = (/主色[^#\n]{0,24}(#[0-9A-Fa-f]{6})/.exec(p3text) || [])[1];
      const r2 = (/(#[0-9A-Fa-f]{6})[^#\n]{0,24}主色/.exec(p3text) || [])[1];
      const r3 = (/主色[\s\S]{0,40}?(#[0-9A-Fa-f]{6})/.exec(p3text) || [])[1];
      const spec = (r1 || r2 || r3 || '').toUpperCase() || null;
      const pal = paletteOfData(D[id].palette);
      const bgv = D[id].bg;
      const curPrim = curPrimary[id];          // _CURRENT-VALUES.md 那一格（多为 null）
      const before = curPrim || spec;
      const fellBack = pal.length >= 2 && (!before || before === bgv || !pal.includes(before));
      const which = curPrim ? '_CURRENT-VALUES'
        : (spec && spec === r1?.toUpperCase()) ? 'regex1(主色后第一个 hex)'
          : (spec && spec === r2?.toUpperCase()) ? 'regex2(hex 后接主色)'
            : spec ? 'regex3(宽松)' : 'none';
      return (fellBack ? '兜底 pal[1] ← ' : '') + which
        + (r1 && r2 && r1.toUpperCase() !== r2.toUpperCase() ? ' ⚠r1/r2 冲突' : '');
    })(),
    L1_is_palette1: l1 === paletteOfData(D[id].palette)[1],
    L1_chroma: l1 ? chromaOf(l1) : null,
    L0_negated_only: specHits.length > 0 && !specFirstClean,
  });
}

const sum = {
  n: rows.length,
  L3_key_present: rows.filter((r) => r.L3_key).length,
  L2_empty: rows.filter((r) => r.L2.length === 0).length,
  L2_empty_ids: rows.filter((r) => r.L2.length === 0).map((r) => r.id),
  L2_multi: rows.filter((r) => r.L2.length > 1).length,
  L0_no_clean_candidate: rows.filter((r) => !r.L0_clean).length,
  L0_no_clean_ids: rows.filter((r) => !r.L0_clean).map((r) => r.id),
  agree: {
    L1_eq_L0clean: rows.filter((r) => r.agree.L1_eq_L0clean).length,
    L1_eq_L2first: rows.filter((r) => r.agree.L1_eq_L2first).length,
    L1_eq_area: rows.filter((r) => r.agree.L1_eq_area).length,
    L0clean_eq_area: rows.filter((r) => r.agree.L0clean_eq_area).length,
    L2first_eq_area: rows.filter((r) => r.agree.L2first_eq_area).length,
  },
  L1_fallback: rows.filter((r) => r.L1_reason.startsWith('兜底')).length,
  L1_fallback_ids: rows.filter((r) => r.L1_reason.startsWith('兜底')).map((r) => r.id + ':' + r.L1),
  L1_low_chroma: rows.filter((r) => r.L1_chroma !== null && r.L1_chroma < 0.08).map((r) => r.id + ':' + r.L1),
};
writeJson('06-primary.json', { at: new Date().toISOString(), summary: sum, rows });

console.log('=== 06 primary 三层比对 ===');
console.log('层覆盖：L1 ' + 30 + '/30 · L2 非空 ' + (30 - sum.L2_empty) + '/30 · L3 有该键 ' + sum.L3_key_present + '/30');
console.log('L2 为空（pickPalette 一个主色都没认出）：' + sum.L2_empty + ' 案 → ' + sum.L2_empty_ids.join(' '));
console.log('L2 认出多个主色的：' + sum.L2_multi + ' 案');
console.log('L0 规格字段 3 里找不到任何非否定语境的「主色」候选：' + sum.L0_no_clean_candidate + ' 案 → ' + (sum.L0_no_clean_ids.join(' ') || '无'));
console.log('');
console.log('两两一致（/30）：');
console.log('  L1 === L0(规格非否定候选)：' + sum.agree.L1_eq_L0clean);
console.log('  L1 === L2(第一个)：        ' + sum.agree.L1_eq_L2first);
console.log('  L1 === 面积主色：          ' + sum.agree.L1_eq_area);
console.log('  L0 === 面积主色：          ' + sum.agree.L0clean_eq_area);
console.log('  L2 === 面积主色：          ' + sum.agree.L2first_eq_area);
console.log('');
console.log('L1 里有多少是兜底产物（pal[1] 而非真主色）：' + sum.L1_fallback + ' 案');
console.log('  ' + sum.L1_fallback_ids.join(' '));
console.log('L1 取到低彩度色（灰/黑/白，不像主色）：' + sum.L1_low_chroma.length + ' 案 → ' + (sum.L1_low_chroma.join(' ') || '无'));
console.log('');
console.log(mdTable(['案', 'L0 规格(非否定)', 'L1 data.js', 'L2 dna(数组)', 'L3', '面积主色', 'L1=L0', 'L1=L2', 'L1=面积', 'L1 来源'],
  rows.map((r) => [r.id, r.L0_clean || '—', r.L1 || '—', r.L2.join(',') || '[]', r.L3_key ? '有' : '无',
    r.areaPrimary || '—', r.agree.L1_eq_L0clean ? '✓' : '✗', r.agree.L1_eq_L2first ? '✓' : '✗',
    r.agree.L1_eq_area ? '✓' : '✗', r.L1_reason])));
console.log('');
console.log('→ deliverables/71-plan/facts/06-primary.json');
