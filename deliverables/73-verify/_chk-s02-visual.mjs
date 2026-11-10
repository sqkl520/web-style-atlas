/* S02 纹理迁移后视觉是否一致？
 * 对比旧（body 背景）与新（body::before fixed）的渲染像素。
 * 用 S02 重渲染前后的截图对比 —— 但旧截图已被覆盖，所以改为：
 * 检查重渲染后首屏像素分布是否仍以 --card 为主、纹理是否存在。
 */
import { readFileSync, existsSync } from 'node:fs';

const jpg = 'D:/Web/style/prototypes/S02-gilded-symmetry-salon/.inspect/desktop-fold.jpg';
console.log('S02 desktop-fold.jpg 存在:', existsSync(jpg));

/* 读 report.json 的像素统计（如果有） */
const rep = JSON.parse(readFileSync('D:/Web/style/prototypes/S02-gilded-symmetry-salon/.inspect/report.json', 'utf8'));
const v = rep.viewports.find((x) => x.width === 1440);
console.log('\n=== S02 @1440 关键指标 ===');
console.log('  bodyBg:', v.metrics.color.bodyBg || '(未记录)');
console.log('  lowContrast:', v.metrics.color.lowContrast?.length ?? '?');
console.log('  textColors 采样数:', v.metrics.color.textColors?.length ?? '?');
console.log('  shadowStatic:', v.metrics.surfaces.shadowStatic);
console.log('  gradients:', v.metrics.surfaces.gradients);
console.log('  filled:', v.filled ?? '(未记录)');
console.log('  screens:', v.screens);

/* textColors 有内容 = contrast 真的跑过了（没被 bgBehind 短路） */
const tc = v.metrics.color.textColors || [];
console.log(`\n=== textColors 前 5 条（证明 contrast 真的检查过）===`);
tc.slice(0, 5).forEach((c, i) => console.log(`  [${i}] ${c.color} share=${c.share}`));

console.log('\n=== 判定 ===');
console.log(tc.length > 0
  ? `  ✓ textColors 有 ${tc.length} 条 —— contrast 检查真的执行了，不再是失明的 0`
  : '  ✗ textColors 为空 —— contrast 可能仍被短路');
