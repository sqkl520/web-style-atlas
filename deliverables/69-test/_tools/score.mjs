// 选案依据：把 30 份提示词按「可机械验证的声称密度」与「动效/气质依赖度」打分。
// 只用提示词文本本身，不读任何原型。输出候选排序，供人工定案。
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'D:/Web/style/deliverables/69-test/_staging';
const idx = JSON.parse(readFileSync(join(OUT, 'index.json'), 'utf8'));
const rows = [];
for (const r of idx) {
  const p = readFileSync(join(OUT, `prompt-${r.id}.txt`), 'utf8');
  const L = p.split('\n');
  const g = (pre) => (L.find((l) => l.startsWith(pre)) || '');
  const pal = g('1. 配色'), lw = g('5. 线宽'), mech = g('这个风格的签名动作');
  const struct = L.filter((l) => /^\d\. /.test(l) && !/^\d\. (配色|字体|圆角|阴影|线宽)/.test(l)).join('\n');
  const hexN = (pal.match(/#[0-9A-Fa-f]{6}/g) || []).length;
  const lwN = (lw.match(/[\d.]+px/g) || []).length;
  // 机制句里的「数字+单位」——这是结构可测量性的代理
  const mechN = (mech.match(/\d+(\.\d+)?(px|mm|%|°|fr|em|ms)/g) || []).length;
  const structN = (struct.match(/\d+(\.\d+)?(px|%|°|fr|em| 个| 块| 栏| 行| 列| 条| 处| 段| 级| 档| 张| 枚)/g) || []).length;
  // 动效/滚动依赖：提示词自己提了 scroll/漂移/随滚动，而防退化⑧又禁滚动视差 → 自相矛盾风险
  const motionWords = (p.match(/滚动|漂移|随滚动|视差|动画|按下时/g) || []).length;
  const bansMotion = /⑧ 不要自动轮播、滚动视差/.test(p);
  const shadowInsetOnly = /只用 inset/.test(g('4. 阴影'));
  const shadowNone = /^4\. 阴影：无阴影/.test(g('4. 阴影'));
  const shadowMixed = /混用/.test(g('4. 阴影'));
  const radiusZero = /全站一律 0/.test(g('3. 圆角'));
  rows.push({
    id: r.id, tone: r.tone, n: r.minItems, pics: r.minPics, deg: r.degrades,
    hexN, lwN, mechN, structN, motionWords, bansMotion,
    shadow: shadowInsetOnly ? 'inset-only' : shadowNone ? 'none' : shadowMixed ? 'mixed' : 'other',
    radiusZero,
    score: hexN * 1.0 + lwN * 1.2 + mechN * 1.6 + structN * 0.9 + (radiusZero ? 3 : 0) + (shadowInsetOnly || shadowNone ? 3 : 0),
    ambig: motionWords * 2.0 + (shadowMixed ? 4 : 0),
  });
}
rows.sort((a, b) => b.score - a.score);
writeFileSync(join(OUT, 'score.json'), JSON.stringify(rows, null, 2), 'utf8');
console.log('id   tone            hex lw mechN structN motion score ambig shadow       radius0');
for (const r of rows) {
  console.log(
    `${r.id} ${r.tone.padEnd(15)} ${String(r.hexN).padStart(3)} ${String(r.lwN).padStart(2)} ${String(r.mechN).padStart(5)} ${String(r.structN).padStart(7)} ${String(r.motionWords).padStart(6)} ${String(r.score.toFixed(1)).padStart(5)} ${String(r.ambig).padStart(5)} ${r.shadow.padEnd(12)} ${r.radiusZero}`
  );
}
