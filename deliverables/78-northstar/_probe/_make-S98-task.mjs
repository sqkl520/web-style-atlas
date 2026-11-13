/* 造 S98：S31 提示词的「无数值版」，用于负对照 B。
 *
 * 这个实验要回答的问题：
 *   把全部尺寸/比例/数量删掉之后，只留文字描述，模型还能不能做出 12 等分 + 刻度带？
 *
 * 为什么这样删（每一步都是设计决策，不是懒）：
 *
 * 1. **删尺寸、比例、数量**：60px / 34px / 3px / 12px / 2px / 16px / 6.5 倍 / 104px /
 *    1px 线宽 / 6 个条目 / 1 个图片位置 —— 全部删掉。这些是「数值通道」的载体，
 *    负对照 B 就是要测它们承不承重。
 *
 * 2. **保留配色 hex**：配色是**设计身份**，不是尺寸参数。而且保留它有一个额外的好处 ——
 *    如果产物仍然精确用上那 5 个色，说明「照着色值做」这条通道本来就是通的，
 *    那么如果尺寸那部分做不出来，差异就只能来自「数值 vs 文字」。
 *    如果连配色也删，就分不清是「删太多了让它无从下手」还是「文字不承重」。
 *
 * 3. **保留字体名**：同上，字体是身份不是尺寸。
 *
 * 4. **把数值改写成纯文字描述**，而不是整句删掉。例如：
 *      「主刻度每 60px、长 34px、3px 宽，次刻度每 12px、长 12px、2px 宽」
 *    → 「主刻度间隔宽、刻线长而粗；次刻度间隔窄、刻线短而细」
 *    这样提示词仍然在描述同一个设计，只是不再给可测数字。
 *    **如果只是删掉整句，测的就变成了「信息量减少」而不是「数值换成文字」。**
 *
 * 用法：node _make-S98-task.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const src = readFileSync(join(ROOT, 'deliverables/78-northstar/blind/S31/task.txt'), 'utf8');
const lines = src.split('\n');

const out = lines.map((line, i) => {
  const n = i + 1;

  /* 第 6 行：机制句 —— 核心。把六个可测值换成形容词。 */
  if (n === 6) {
    return '这个风格的签名动作：一条横向尺规把版面切成上中下三段：主刻度的间隔宽、刻线长而粗，' +
      '次刻度的间隔窄、刻线短而细，主次两级按固定倍数递进；上下各一排共用两条贯穿基线——' +
      '刻度既做读数骨架也顶掉图片的位置。';
  }

  /* 第 13 行：线宽 —— 删掉具体档位，改成「只有一种」。 */
  if (n === 13) {
    return '5. 线宽只用一级，全站所有线条同一个粗细。';
  }

  /* 第 14 行：字号 —— 删掉 16px / 6.5 倍 / 104px，保留「标题要很大」这个意思。 */
  if (n === 14) {
    return '6. 字号：正文是常规的阅读字号；最大标题要压到正文的好几倍，' +
      '大到能撑满版心的宽度。比这更小就撑不出这个版式——这是本案最容易被做塌的一处。' +
      '中间层级你按内容需要分，但**最大那一档必须够大**。';
  }

  /* 第 16 行：条目数 —— 删掉 6，改成「若干」。 */
  if (n === 16) {
    return '1. 这个版式设计时排了一组条目——这是版式的规模，不是你的内容量。';
  }

  /* 第 19 行：图片数 —— 删掉 1，改成「要放图」。 */
  if (n === 19) {
    return '4. 版式里要有**不同的**图片位置（不是几个 img 标签就够——同一张图重复用不算）。' +
      '每个位都要占出真实可见的面积与合适比例，路径用 images/ 占位（见末尾输出要求）。';
  }

  /* 第 31 行：风险段里还有 60px / 12px / 3px / 1px / 六个 —— 一并改成文字。 */
  if (n === 31) {
    return '这一案最容易做成的错误样子（作者原话）：规避动作三条：' +
      '一是方阵必须贴左边缘长出，不留居中留白，格高不等；' +
      '二是记忆点必须落在主刻度的间隔、次刻度的间隔、主刻度的线宽这三个可测值上，' +
      '且样式与纹理图用同一组比例；' +
      '三是零圆角零投影零渐变，任何"深度"只允许来自细边框与线宽差。' +
      '另有一条反向风险："很安静"容易被做成"没做完"——本页不靠留白装样子，' +
      '每个服务格都有具体的服务说明（洗油写"一天最多接两只"，' +
      '换电池写"不测的换电池是把水汽关进表壳"）。';
  }

  return line;
});

const text = out.join('\n');

/* 自检：除了配色 hex 与字体相关的行，不应再有任何「数字+px」或「N 倍」 */
const bodyNoPalette = text.split('\n')
  .filter((l) => !/^1\.\s*配色只用这几个值/.test(l))
  .join('\n');
const pxHits = [...bodyNoPalette.matchAll(/[\d.]+\s*px/g)].map((m) => m[0]);
const beiHits = [...bodyNoPalette.matchAll(/[\d.]+\s*倍/g)].map((m) => m[0]);

const dir = join(ROOT, 'deliverables/78-northstar/blind/S98');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'task.txt'), text);

console.log(`S98 写出：${text.split('\n').length} 行 / ${Buffer.byteLength(text)} 字节`);
console.log(`来源 S31：${lines.length} 行 / ${Buffer.byteLength(src)} 字节`);
console.log('\n=== 自检：还应残留的尺寸数值 ===');
console.log('  带 px 的:', pxHits.length ? pxHits.join(' ') : '（无）');
console.log('  带 倍 的:', beiHits.length ? beiHits.join(' ') : '（无）');
console.log('\n=== 保留的配色行 ===');
console.log('  ' + text.split('\n').find((l) => l.includes('配色只用这几个值')));
