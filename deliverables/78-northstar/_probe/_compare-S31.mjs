/* 把隔离环境生成的第一份样本（S31，完全盲测）与原型对账。
 * 这是生成侧的第一次真实测量 —— 之前的 Q7 产物都不满足「隔离」这个前提。 */
import { measure } from '../../74-q7/measure.mjs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const proto = join(ROOT, 'prototypes/S31-quiet-mid-grey-rulesheet/index.html');
const gen = join(ROOT, 'deliverables/78-northstar/_probe/_feasibility-S31-out.html');

const [w, g] = [await measure(proto), await measure(gen)];
const pick = (o) => ({
  gridTracks: o.gridTracks, gridSel: o.gridSel, mainRatio: o.mainRatio,
  headBody: o.headBodyRatio, h1: o.h1Size, body: o.bodySize,
  bw: o.borderWidths, imgs: `${o.imgCount}/${o.imgVisible}`,
  hexes: o.hexes.length, words: o.words,
});
console.log('原型 :', JSON.stringify(pick(w), null, 1));
console.log('生成 :', JSON.stringify(pick(g), null, 1));

console.log('\n=== 可判定量对比 ===');
const cmp = (name, a, b, tol) => {
  const ok = tol ? Math.abs(b - a) / (a || 1) <= tol : a === b;
  console.log(`  ${ok ? '✓' : '✗'} ${name}: 原型 ${a}  生成 ${b}`);
};
if (w.headBodyRatio && g.headBodyRatio) cmp('标题/正文比', w.headBodyRatio, g.headBodyRatio, 0.20);
cmp('栏数(tracks)', w.gridTracks, g.gridTracks);
cmp('主容器', w.gridSel, g.gridSel);
console.log(`  字宽集合 原型 ${w.borderWidths.join('/')}  生成 ${g.borderWidths.join('/')}`);
process.exit(0);
