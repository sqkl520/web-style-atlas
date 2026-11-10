// 任务 C 的像素级复核：屏幕上**真正占主导**的色是哪些，它们在 palette 里吗？
//
// 为什么需要这一步：元素级面积会被嵌套元素重复计算（S02 里 8.8M 的文档面积上
// 累计出 24.8M 的元素面积），所以「面积占比」不能直接当「屏幕上占多少」。
// 像素级才是屏幕的真相。
//
// 这个探针回答的是最要紧的问题：
//   palette 里的头号色（背景色）到底是不是屏幕上最大的那块颜色？
//   如果不是，那 palette 就是错的 —— 比「多了几个装饰色」严重得多。
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hexToRgb } from './png.mjs';

const HERE = 'D:/Web/style/deliverables/70-audit/measure';
const colors = JSON.parse(readFileSync(join(HERE, 'colors-30.json'), 'utf8'));
const dna = JSON.parse(readFileSync('D:/Web/style/prototypes/_prompts/dna-clean.json', 'utf8'));
const dnaById = {};
for (const k of Object.keys(dna)) dnaById[dna[k].id] = dna[k];

const out = {};
for (const id of Object.keys(colors).sort()) {
  const c = colors[id];
  const claimed = (dnaById[id]?.palette || []).map((s) => (s.match(/#[0-9A-Fa-f]{6}/) || [])[0]).filter(Boolean).map((h) => h.toUpperCase());
  const claimedSet = new Set(claimed);
  const total = c.pixel.counted;

  // 按像素绘制量排序（paintedPx 已包含 exact + near + alpha 归并）
  const byPx = c.colors.map((x) => ({
    hex: x.hex, px: x.paintedPx, share: total ? x.paintedPx / total : 0,
    inClaim: claimedSet.has(x.hex),
    onBodyText: x.onBodyText, props: Object.keys(x.props),
  })).sort((a, b) => b.px - a.px);

  const dominant = byPx[0];
  const dominantClaimed = dominant && dominant.inClaim;
  // 声称色里实际绘制最多的是哪个
  const bestClaimed = byPx.filter((x) => x.inClaim)[0] || null;
  // 声称了但屏幕上几乎没画出来的
  const claimedButInvisible = claimed.filter((h) => {
    const e = byPx.find((x) => x.hex === h);
    return !e || e.share < 0.005;
  });
  // 屏幕上显著但不在声称里
  const significantOutside = byPx.filter((x) => !x.inClaim && x.share >= 0.01);

  out[id] = {
    id,
    claimedCount: claimed.length,
    claimed,
    dominant: dominant && { hex: dominant.hex, share: +dominant.share.toFixed(4), inClaim: dominantClaimed, props: dominant.props },
    bestClaimed: bestClaimed && { hex: bestClaimed.hex, share: +bestClaimed.share.toFixed(4) },
    backgroundMismatch: !!(dominant && !dominantClaimed),
    claimedButInvisible,
    significantOutside: significantOutside.map((x) => ({ hex: x.hex, share: +x.share.toFixed(4), onBodyText: x.onBodyText })),
    topPixelColors: byPx.slice(0, 6).map((x) => ({ hex: x.hex, share: +x.share.toFixed(4), inClaim: x.inClaim })),
  };
  const flag = out[id].backgroundMismatch ? '  <<< 主导色不在 palette' : '';
  console.log(`${id}: 主导 ${dominant ? dominant.hex : '-'} ${dominant ? (dominant.share * 100).toFixed(1) + '%' : ''}` +
    `${dominantClaimed ? '(在)' : '(不在)'} | 声称里最多 ${bestClaimed ? bestClaimed.hex + ' ' + (bestClaimed.share * 100).toFixed(1) + '%' : '无'}` +
    `${claimedButInvisible.length ? ' | 声称但不可见 ' + claimedButInvisible.join(',') : ''}${flag}`);
}

writeFileSync(join(HERE, 'pixel-dominance-30.json'), JSON.stringify(out, null, 1), 'utf8');

const mismatch = Object.values(out).filter((x) => x.backgroundMismatch);
console.log(`\n=== 主导色不在 palette 的案：${mismatch.length} / 30 ===`);
for (const m of mismatch) console.log(`  ${m.id}: 屏幕主导 ${m.dominant.hex} ${(m.dominant.share * 100).toFixed(1)}%，palette 里最接近的是 ${m.bestClaimed ? m.bestClaimed.hex + ' ' + (m.bestClaimed.share * 100).toFixed(1) + '%' : '无'}`);

const invisible = Object.values(out).filter((x) => x.claimedButInvisible.length);
console.log(`\n=== 声称了但屏幕占比 <0.5% 的色：${invisible.length} 案 ===`);
for (const m of invisible) console.log(`  ${m.id}: ${m.claimedButInvisible.join(', ')}`);
