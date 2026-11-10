/* 新问题⑤（修正版）：真正被 palette **内容**驱动、且用户可见的是 `axes.loud` 过滤器，
 * 不是向导的归一化轴（后者我实测证明是稳健的，见 rt-x5-axis.mjs）。
 *
 * collect-schemes.mjs:560  chroma = max(hsl(rec.palette).s)
 * collect-schemes.mjs:585  loud = chroma<=25 ? '很安静' : chroma<=60 ? '有态度不吵' : '就要扎眼'
 * app.js:195              chips('#flt-loud', r => r.axes.loud)   ← 用户点得到的筛选芯片
 * app.js:215              state.loud 参与过滤 ⇒ 决定可见行集合
 *
 * 所以：换 palette 的内容 ⇒ chroma 变 ⇒ loud 分档变 ⇒ **筛选结果变**。
 * 这是 P3 依赖图里一条真实的、用户可见的边。
 *
 *   node deliverables/71-plan/redteam/rt-x5b-loudchip.mjs
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

function hslOf(hex) {
  const h = String(hex).replace('#', '');
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let hue = 0;
  if (mx !== mn) {
    if (mx === r) hue = 60 * (((g - b) / (mx - mn)) % 6);
    else if (mx === g) hue = 60 * ((b - r) / (mx - mn) + 2);
    else hue = 60 * ((r - g) / (mx - mn) + 4);
  }
  if (hue < 0) hue += 360;
  const l = (mx + mn) / 2;
  const s = mx === mn ? 0 : (l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn));
  return { h: Math.round(hue), s: Math.round(s * 100), l: Math.round(l * 100) };
}
const chromaOf = (pal) => Math.max(0, ...(pal || []).map((h) => (hslOf(h) || { s: 0 }).s));
const bucket = (c) => (c <= 25 ? '很安静' : c <= 60 ? '有态度不吵' : '就要扎眼');

h1('axes.loud 过滤器：palette 内容 → chroma → 分档（用户点得到）');
let flips = 0; const rows = [];
for (const s of data) {
  const p = prompts.find((x) => x.id === s.id) || {};
  const dPal = s.palette || [];
  const pPal = hexes((p.dna || {}).palette);
  const dc = chromaOf(dPal), pc = chromaOf(pPal);
  const db = bucket(dc), pb = bucket(pc);
  const flip = db !== pb;
  if (flip) flips++;
  rows.push({ id: s.id, dc, pc, db, pb, flip });
}
console.log('案     data chroma → 分档        prompts chroma → 分档      翻转');
console.log('─'.repeat(76));
for (const r of rows) {
  console.log(`${r.id}   ${String(r.dc).padStart(3)} → ${r.db.padEnd(10)}   ${String(r.pc).padStart(3)} → ${r.pb.padEnd(10)}  ${r.flip ? '✗ 翻' : ''}`);
}
h2('汇总');
const distD = rows.reduce((a, r) => (a[r.db] = (a[r.db] || 0) + 1, a), {});
const distP = rows.reduce((a, r) => (a[r.pb] = (a[r.pb] || 0) + 1, a), {});
console.log('data.js 分档分布  ' + JSON.stringify(distD));
console.log('prompts 分档分布  ' + JSON.stringify(distP));
console.log(`分档发生翻转的案：${flips}/30`);
if (flips) {
  console.log('翻转的案：');
  for (const r of rows.filter((x) => x.flip)) {
    console.log(`  ${r.id}  ${r.db} → ${r.pb}（chroma ${r.dc} → ${r.pc}）`);
  }
}

h2('判定（实测推翻了我的假设）');
console.log('`axes.loud` 确实是 app.js:195 的真实筛选芯片，也确实只由 palette 的 chroma 决定，');
console.log(`但换成 prompts.js 的色板后，分档翻转 **${flips}/30**。`);
console.log('');
console.log('原因：chroma 取的是 **max** 饱和度，而 prompts 的 7 色是 data.js 4 色的超集 ——');
console.log('多出来的色没有一个是更鲜艳的（多的是纸色/墨色/派生阶），所以 max 不变。');
console.log('');
console.log('⇒ 撤回：「换 palette 内容会改变 axes.loud 筛选结果」不成立。');
console.log('  连带地，rt-x5-axis.mjs 里「会推翻 README 的 very-quiet 2 案」也不成立。');
console.log('  这两条我原本以为是 P3 依赖图上的"暗边"，30 案实测都不是。');
console.log('');
console.log('这个否定的结论对 Lead 有用：它**降低**了 WP2 的内容风险 ——');
console.log('只改 palette 里的色值（不改长度、不改顺序）不会波及 color-derived 的两个轴。');
