// Q3 核心问题：从 CSS 声明能不能合成人读得懂的「比例/密度/字阶/节奏」四行？
// 判据不是"能抽到数"，是"抽到的句子与规格字段 5 说的是一回事"。
import { parse } from './_extract-v2.mjs';

const wc = (v) => Math.round(v * 10) / 10;
const CSS = 'prototypes/S17-revenue-stamp-stub/style.css';
const d = parse(CSS);

/* ── 行 1：比例 ───────────────────────────────────────────── */
function specRatio(decls) {
  const gtc = decls.filter(x => x.prop === 'grid-template-columns');
  const base = gtc.filter(x => !x.media);
  // 挑「轨道数最多」的那条基础规则 —— 它通常是主布局
  const pick = base.slice().sort((a, b) => b.val.split(/\s+/).length - a.val.split(/\s+/).length)[0];
  if (!pick) return null;
  const tracks = pick.val.split(/\s+/);
  const frs = tracks.filter(t => /fr$/.test(t)).map(t => parseFloat(t));
  const px = tracks.filter(t => /^\d+(\.\d+)?px$/.test(t)).map(t => parseFloat(t));
  const explor = [];
  if (frs.length) explor.push(`栏宽比 ${frs.join(':')}`);
  if (px.length) explor.push(`${px.join('px、')}px 的实体隔条`);
  // 断点覆写
  const over = gtc.filter(x => x.media).map(x => ({ m: x.media, v: x.val, line: x.line }));
  return { sel: pick.sel, line: pick.line, tracks: tracks.length, text: explor.join('，'), overrides: over };
}

/* ── 行 2：字阶 ───────────────────────────────────────────── */
function specType(decls) {
  const fs = decls.filter(x => x.prop === 'font-size');
  const fluid = fs.filter(x => /clamp|vw/.test(x.val));
  const fixed = fs.filter(x => /^\d+(\.\d+)?px$/.test(x.val)).map(x => ({ v: parseFloat(x.val), line: x.line, sel: x.sel }));
  const steps = [...new Set(fixed.map(x => x.v))].sort((a, b) => a - b);
  return {
    fluid: fluid.map(x => ({ val: x.val, line: x.line, sel: x.sel })),
    steps,
    count: steps.length,
    text: `${steps.length} 档固定字号（${steps.join('/')}px）` + (fluid.length ? `，另 ${fluid.length} 处流体字号` : ''),
  };
}

/* ── 行 3：密度 ───────────────────────────────────────────── */
function specDensity(decls) {
  const gaps = decls.filter(x => x.prop === 'gap');
  const vals = [...new Set(gaps.map(x => x.val))];
  const pxVals = vals.filter(v => /^\d+px$/.test(v)).map(v => parseFloat(v)).sort((a, b) => a - b);
  return { distinct: vals.length, px: pxVals, text: `gap 有 ${vals.length} 个不同取值` + (pxVals.length ? `（${pxVals.join('/')}px）` : '') };
}

/* ── 行 4：节奏 ───────────────────────────────────────────── */
function specRhythm(decls) {
  const lh = decls.filter(x => x.prop === 'line-height');
  const uniq = [...new Set(lh.map(x => x.val))];
  const ratios = uniq.filter(v => /^\d+(\.\d+)?$/.test(v)).map(parseFloat).sort((a, b) => a - b);
  const bps = [...new Set(decls.filter(x => x.media).map(x => x.media))];
  return { lineHeights: uniq, ratios, breakpoints: bps.length, text: `行高 ${ratios.length} 档（${ratios.join('/')}）` + (uniq.length > ratios.length ? ` + ${uniq.length - ratios.length} 处绝对行高` : '') };
}

const out = { ratio: specRatio(d), type: specType(d), density: specDensity(d), rhythm: specRhythm(d) };
console.log('=== 从 S17 的 CSS 合成的四行 ===');
console.log('比例：', out.ratio.text, `（${out.ratio.sel}，L${out.ratio.line}，${out.ratio.tracks} 轨）`);
console.log('字阶：', out.type.text);
console.log('密度：', out.density.text);
console.log('节奏：', out.rhythm.text);
console.log('');
console.log('断点覆写：');
out.ratio.overrides.forEach(o => console.log(`  L${o.line} [${o.m}] → ${o.v}`));
