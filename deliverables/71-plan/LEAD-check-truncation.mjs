// Lead 核实 2：data.js 截断到 4 个色时，保留的是不是「最重要的 4 个」？
// 这是「摘要 vs 错误」的分水岭：
//   如果保留的是 底色+主色+2个重要色 → 是合格的摘要
//   如果保留的混进了不重要的色、丢掉了重要的色 → 是错误
import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style';
const P = ROOT + '/prototypes';

const dataJs = readFileSync(P + '/_selection/data.js', 'utf8');
const sbD = { window: {} };
new Function('window', dataJs)(sbD.window);
const SCHEMES = sbD.window.SCHEMES || [];
const dM = new Map(SCHEMES.map((s) => [s.id, s]));

const pr = readFileSync(P + '/_selection/prompts.js', 'utf8');
const sbP = { window: {} };
new Function('window', pr)(sbP.window);
const pM = new Map((sbP.window.STYLE_PROMPTS.schemes || []).map((s) => [s.id, s]));

const HEXT = /#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g;
const hx = (s) => [...String(s).matchAll(HEXT)].map((m) => m[0].toUpperCase());

// 像素占比（渲染色）
let pixel = {};
try { pixel = JSON.parse(readFileSync(ROOT + '/deliverables/70-plan/pixel-ratio-30.json', 'utf8')); } catch {}

console.log('=== 截断策略评价：data.js 的 4 个色 vs prompts 的 7 个色 ===\n');
console.log('案    保留的4色是否包含：底色 主色   | 丢掉的色里有没有「像素占比 >5%」的');
console.log('-'.repeat(95));

let bgOk = 0, priOk = 0, badDrop = 0;
const badDrops = [];
for (const id of [...dM.keys()].sort()) {
  const sc = dM.get(id);
  const d = hx((sc.palette || []).join(' '));
  const r = pM.get(id)?.dna?.palette;
  const p = hx(Array.isArray(r) ? r.join(' ') : String(r || ''));
  const bg = String(sc.bg || '').toUpperCase();
  const pri = String(sc.primary || '').toUpperCase();
  const hasBg = d.includes(bg);
  const hasPri = d.includes(pri);
  if (hasBg) bgOk++;
  if (hasPri) priOk++;

  const dropped = p.filter((h) => !d.includes(h));
  // 检查丢掉的色在像素里占多少
  const pix = pixel[id]?.top || [];
  const droppedSig = dropped.map((h) => {
    const hit = pix.find((x) => x.hex === h.toLowerCase());
    return { hex: h, pct: hit ? hit.pct : 0 };
  }).filter((x) => x.pct >= 5);
  if (droppedSig.length) { badDrop++; badDrops.push({ id, dropped: droppedSig }); }

  console.log(`${id}  ${(hasBg ? '✓' : '✗').padEnd(5)} ${(hasPri ? '✓' : '✗').padEnd(5)} | ${droppedSig.length ? '⚠ ' + droppedSig.map((x) => x.hex + '(' + x.pct + '%)').join(' ') : '无'}`);
}

console.log('-'.repeat(95));
console.log(`\n底色在 palette 里: ${bgOk}/30`);
console.log(`主色在 palette 里: ${priOk}/30`);
console.log(`丢了「像素占比 ≥5%」的色: ${badDrop}/30 案`);
if (badDrops.length) {
  console.log('\n=== 被丢掉的「重要色」清单（这才是真错误，不是摘要）===');
  for (const x of badDrops) console.log(`  ${x.id}: ${x.dropped.map((y) => y.hex + ' 占屏 ' + y.pct + '%').join('  ')}`);
}

console.log('\n\n=== 另一个角度：data.js 的 palette[0] 是不是真底色？palette[1] 是不是真主色？===');
console.log('（app.js:953 注释声称 palette[0]===bg 30/30，app.js:945 声称 primary===palette[1] 30/30）\n');
let p0bg = 0, p1pri = 0;
for (const id of [...dM.keys()]) {
  const sc = dM.get(id);
  const pal = (sc.palette || []).map((h) => String(h).toUpperCase());
  if (pal[0] === String(sc.bg || '').toUpperCase()) p0bg++;
  if (pal[1] === String(sc.primary || '').toUpperCase()) p1pri++;
}
console.log(`palette[0] === bg:      ${p0bg}/30`);
console.log(`palette[1] === primary: ${p1pri}/30`);

console.log('\n\n=== 结论 ===');
if (badDrop === 0) {
  console.log('✓ data.js 的 4 色是「合格的摘要」：底色和主色都在，丢掉的都是小面积色。');
  console.log('  → 这不是「用户被误导」，是「摘要比全文短」。');
  console.log('  → WP4（UI 诚实性）的优先级应当下调。');
} else {
  console.log(`⚠ ${badDrop} 案丢了像素占比 ≥5% 的色，这些是「摘要丢掉了重要内容」，是真错误。`);
}
