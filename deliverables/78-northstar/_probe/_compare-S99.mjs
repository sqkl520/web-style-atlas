/* 负对照 S99 的对账器：把隔离产出的 HTML 与 S31 的产出、与 35 个原型逐项比。
 *
 * 三件事，各对应任务里的一个问题：
 *   ① S99 的产物有没有实现它自己的机制句  → grep 机制句里的每一个可测值
 *   ② 它有没有意外撞上某个真实原型的特征  → 配色 / 字号比 / 线宽 / 轨道数 逐案比
 *   ③ 与 S31 的产物相比结构感是否更弱      → 轨道数、主容器、是否有可复现骨架
 *
 * 用法：node deliverables/78-northstar/_probe/_compare-S99.mjs
 * 前置：把隔离产物复制成 _probe/_S99-out.html（measure.mjs 的站点根是仓库根，
 *       C:\tmp 下的文件量不了 —— 这是它的已知边界，不是这里的问题）。
 */
import { measure } from '../../74-q7/measure.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'deliverables/78-northstar/_probe/_S99-out.html');
const S31OUT = join(ROOT, 'deliverables/78-northstar/_probe/_sandbox-S31-out.html');

if (!existsSync(OUT)) {
  console.error(`缺产物：${OUT}\n先把 C:\\tmp\\bb\\S99 下的 out.html 复制过来。`);
  process.exit(1);
}

/* ── 35 案的真值（配色 / 字号比 / 线宽 / 轨道数）─────────────────────────
 * 来自 prompts.js 的 dna（生成器从各案 style.css 实测抽取）+ 已跑过的全库度量。 */
const c = { window: {} };
vm.createContext(c);
vm.runInContext(readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8'), c);
const P = c.window.STYLE_PROMPTS.schemes;

const nums = (s) => (String(s).match(/\d+(?:\.\d+)?/g) || []).map(Number);
const proto = P.map((s) => {
  const d = s.dna;
  const h1 = parseFloat(d.h1SizeAt1440) || 0;
  const body = nums(d.bodySize)[0] || 0;
  return {
    id: s.id,
    hexes: new Set((String(d.palette).match(/#[0-9A-Fa-f]{6}/g) || []).map((h) => h.toUpperCase())),
    ratio: body ? Math.round((h1 / body) * 10) / 10 : null,
    widths: new Set(nums(d.lineWidths)),
    display: d.fonts && d.fonts.display,
    bodyFont: d.fonts && d.fonts.body,
  };
});

/* ── ① 机制句逐值 ─────────────────────────────────────────────────────── */
const html = readFileSync(OUT, 'utf8');
const cssBlock = (html.match(/<style[\s\S]*?<\/style>/i) || [''])[0];
/* 判据分两类，混在一起会得到假绿：
 *   A 类「必须出现在 CSS 里」—— 真正的实现值（132px 栏宽、1×9px 端点、12px 断口）
 *   B 类「必须出现在正文里」—— 读数本身（每块的行数）
 * 只看 HTML 文本命中会把「模型写了注释说要用」当成「实现了」。 */
const checks = [
  { name: '尺寸链栏宽 132px', re: /132px/g, where: 'css' },
  { name: '端点短线 1×9px（宽1 高9）', re: /(width\s*:\s*1px[^;{]*height\s*:\s*9px)|(height\s*:\s*9px[^;{]*width\s*:\s*1px)|(1px\s*(?:solid|none)[^;]*9px)/gi, where: 'css' },
  { name: '尺寸线 1px', re: /1px/g, where: 'css' },
  { name: '断口 12px', re: /12px/g, where: 'css' },
  { name: '正文字号 15px', re: /font-size\s*:\s*15px/g, where: 'css' },
  { name: '行高 24px（正文一行）', re: /line-height\s*:\s*24px|24px\s*(?:;|})[^}]*line-height|--lh\s*:\s*24px/g, where: 'css' },
  { name: '逐级内移 18px', re: /18px/g, where: 'css' },
  { name: '最大标题 93px', re: /93px/g, where: 'css' },
  { name: '线宽只有 1px/2px 两级', re: /2px/g, where: 'css' },
  { name: '配色 5 个 hex 全部出现', re: null, where: 'css' },
];

console.log('=== ① 机制句逐值（CSS 内）===');
for (const ck of checks) {
  if (ck.re === null) continue;
  const hits = (cssBlock.match(ck.re) || []).length;
  console.log(`  ${hits > 0 ? '✓' : '✗'} ${ck.name}  ×${hits}`);
}
const S99_HEX = ['#E8E3D9', '#1F2A2E', '#7A8C8E', '#3C4A4D', '#C9A227'];
const hexFound = S99_HEX.filter((h) => new RegExp(h, 'i').test(cssBlock));
console.log(`  ${hexFound.length === 5 ? '✓' : '✗'} 配色：${hexFound.length}/5  → ${hexFound.join(' ')}`);

/* 读数：行数是不是真的按块标的（正文里应当出现多组不同的两位数字读数） */
const textOnly = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
const nums2 = (textOnly.match(/\b(?:1[0-9]|[2-9][0-9])\b/g) || []);
const distinctNums = [...new Set(nums2)];
console.log(`  ${distinctNums.length >= 4 ? '✓' : '✗'} 读数数字：正文里出现 ${distinctNums.length} 个互不相同的两位数 → ${distinctNums.slice(0, 12).join(' ')}`);

/* ── ② 与 35 案特征比对 ─────────────────────────────────────────────────── */
const [m99, m31] = [await measure(OUT), existsSync(S31OUT) ? await measure(S31OUT) : null];
const hexes99 = new Set(m99.hexes.map((h) => h.toUpperCase()));
/* 只把「5 个设计值」拿去比，#000000 / #0000EE 是浏览器默认色，不是模型的风格选择 */
const styleHexes = S99_HEX.filter((h) => hexes99.has(h));

console.log('\n=== ② 与 35 案特征比对 ===');
let paletteCollisions = [];
for (const p of proto) {
  const inter = styleHexes.filter((h) => p.hexes.has(h));
  if (inter.length) paletteCollisions.push(`${p.id}（${inter.join(' ')}）`);
}
console.log(`  配色撞车：${paletteCollisions.length ? paletteCollisions.join(' / ') : '0 案'}`);

console.log(`  字号比：S99 = ${m99.headBodyRatio}（${m99.bodySizePx}px → ${m99.maxHeadPx}px）`);
const sameRatio = proto.filter((p) => p.ratio === m99.headBodyRatio).map((p) => p.id);
console.log(`    ${sameRatio.length ? '⚠ 与这些案同值：' + sameRatio.join(' ') : '✓ 35 案里没有同值的字号比'}`);

const w99 = m99.borderWidths.map(Number);
const sameW = proto.filter((p) => {
  const pw = [...p.widths].sort().join(',');
  return pw === [...w99].sort().join(',');
}).map((p) => p.id);
console.log(`  线宽集合：S99 = ${m99.borderWidths.join('/')}`);
console.log(`    ${sameW.length ? '⚠ 与这些案完全相同：' + sameW.join(' ') : '✓ 35 案里没有相同的线宽集合'}`);

console.log(`  轨道数：S99 = ${m99.gridTracks}（${m99.gridSel}，from ${m99.gridFrom}）`);
console.log(`  图片位：${m99.imgCount} 个 img / ${m99.imgVisible} 可见`);
console.log(`  页面高度：${m99.pageHeight}px，hex 总数 ${m99.hexCount}`);

/* ── ③ 与 S31 产物比结构感 ─────────────────────────────────────────────── */
console.log('\n=== ③ 与 S31 产物比「结构感」===');
if (!m31) {
  console.log('  （缺 S31 产物，跳过）');
} else {
  const rows = [
    ['轨道数', m31.gridTracks, m99.gridTracks],
    ['主容器', m31.gridSel, m99.gridSel],
    ['主容器来源', m31.gridFrom, m99.gridFrom],
    ['字号比', m31.headBodyRatio, m99.headBodyRatio],
    ['线宽集合', m31.borderWidths.join('/'), m99.borderWidths.join('/')],
    ['图片位', `${m31.imgCount}/${m31.imgVisible}`, `${m99.imgCount}/${m99.imgVisible}`],
    ['页面高度 px', m31.pageHeight, m99.pageHeight],
    ['hex 总数', m31.hexCount, m99.hexCount],
  ];
  for (const [k, a, b] of rows) console.log(`  ${k.padEnd(12)} S31=${String(a).padEnd(24)} S99=${b}`);
}
process.exit(0);
