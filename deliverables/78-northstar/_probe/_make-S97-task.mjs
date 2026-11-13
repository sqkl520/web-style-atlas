/* 造 S97：正对照 —— 一份「通用漂亮页面」的描述，不含任何机制、不含任何数值。
 *
 * 它要回答的问题：
 *   S98（有风格文字、无数值）零产物，是因为「没有数值」，
 *   还是因为「任务书里没有可执行的东西」？
 *
 *   如果一份「通用漂亮页面」的描述能让模型正常产出 → S98 的零产物确实归因于数值缺失。
 *   如果它也零产物 → 那 S98 说明的是「没有具体指令就做不出来」，
 *                  与「数值 vs 文字」无关，我的结论要再降一档。
 *
 * 设计要点：
 *   · 保留产品提示词的**全部格式**（40 行、同样的章节），只换内容
 *   · 无机制句、无数值、无风险段里的可测值
 *   · 但仍然要求「做出一个网站首页」—— 它必须是可执行的任务，不是空话
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const src = readFileSync(join(ROOT, 'deliverables/78-northstar/blind/S31/task.txt'), 'utf8');
const lines = src.split('\n');

/* 按行号替换。S31 的 40 行结构：
 *  1-3  自填两行
 *  4    plain
 *  5    调性
 *  6    签名动作（机制句）
 *  7    「视觉硬约束」标题
 *  8-14 六条硬约束
 *  15   「结构约束」标题
 *  16-21 结构约束
 *  22   「防退化」标题
 *  23-30 八条防退化
 *  31   风险段
 *  33   「验收三问」标题
 *  34-36 三问
 *  37-40 输出要求
 */

const out = lines.map((line, i) => {
  const n = i + 1;

  /* 4: plain —— 从一个具体风格换成一个泛泛的「干净现代」描述 */
  if (n === 4) return '请把整页做成这个风格：一个干净、现代、看着舒服的品牌首页。';

  /* 5: 调性 —— 保留结构但换成中性描述 */
  if (n === 5) return '这个案子的调性是「简洁大方」。照这个调性写文案和标题。';

  /* 6: 签名动作 —— 这是正对照的核心：没有机制，只有泛泛的审美要求 */
  if (n === 6) {
    return '这个风格的签名动作：版面干净、留白充足、层级清楚，读起来不费力。' +
      '整体要有设计感，但不要花哨。';
  }

  /* 8: 配色 —— 不给 hex，只说方向 */
  if (n === 8) return '1. 配色：用一个克制的、协调的配色方案，不要太多颜色。';

  /* 9-10: 字体 —— 不给族名 */
  if (n === 9) return '2. 字体：选一款合适的无衬线字体做标题，一款易读的字体做正文。';
  if (n === 10) return '   全站字体统一，不要混用太多种。';

  /* 11: 圆角 */
  if (n === 11) return '3. 圆角：适度使用圆角，让观感柔和一些。';

  /* 12: 阴影 */
  if (n === 12) return '4. 阴影：可以用轻微的阴影增加层次感。';

  /* 13: 线宽 */
  if (n === 13) return '5. 线条：需要分隔时用细线，保持克制。';

  /* 14: 字号 */
  if (n === 14) return '6. 字号：标题明显大于正文，建立清晰的层级。';

  /* 16-21: 结构约束 —— 去掉所有数量 */
  if (n === 16) return '1. 这个版式排一组条目——这是版式的规模，不是你的内容量。';
  if (n === 19) return '4. 版式里要有一些图片位置，每个位都要占出合理的面积与比例。';
  if (n === 21) return '6. 这一版的样子要适合一个正经的品牌首页。';

  /* 31: 风险段 —— 换成通用的避坑 */
  if (n === 31) {
    return '这一案最容易做成的错误样子：做成一堆无意义的装饰堆砌，' +
      '或者看起来像哪个模板直接套出来的。规避动作：保持克制，让内容自己说话。';
  }

  /* 34: 验收第一问 —— 去掉具体气质名 */
  if (n === 34) {
    return '1. 拿远半米看：整页读起来是不是「干净、现代、舒服」这一种气质？气质对了才算过。';
  }

  return line;
});

const text = out.join('\n');

/* 自检：不应有任何 hex、px、倍 */
const hexHits = [...text.matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => m[0]);
const pxHits = [...text.matchAll(/[\d.]+\s*px/g)].map((m) => m[0]);
const beiHits = [...text.matchAll(/[\d.]+\s*倍/g)].map((m) => m[0]);

const dir = join(ROOT, 'deliverables/78-northstar/blind/S97');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'task.txt'), text);

console.log(`S97（正对照）写出：${text.split('\n').length} 行 / ${Buffer.byteLength(text)} 字节`);
console.log('\n=== 自检：不应残留任何具体值 ===');
console.log('  hex:', hexHits.length ? hexHits.join(' ') : '（无）');
console.log('  px :', pxHits.length ? pxHits.join(' ') : '（无）');
console.log('  倍 :', beiHits.length ? beiHits.join(' ') : '（无）');
console.log('\n=== 关键的几行 ===');
for (const n of [4, 6, 8, 14]) console.log(`  L${n}: ${out[n - 1]}`);
