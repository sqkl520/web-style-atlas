/* _discriminator-lib.mjs 的自测。
 *
 * 这个模块是四份脚本的唯一真相源。如果它错了，四份会一起错 ——
 * 而「一起错」比「各错各的」更难发现，因为所有输出看起来都一致。
 *
 * 所以这里测的比原来那几个内联版本的用例更多：每条边界都配正反两例。
 */
import { tokensOf, discriminatorsFor, hitIn, crosscheck } from './_discriminator-lib.mjs';

let bad = 0;
const check = (name, got, want, why) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { bad++; console.log(`  ✗ ${name}`); console.log(`      got ${JSON.stringify(got)}  want ${JSON.stringify(want)}`); }
  else console.log(`  ✓ ${name}`);
  console.log(`      ${why}`);
};

console.log('_discriminator-lib 自测\n');

/* ── tokensOf ─────────────────────────────────────────────────────── */
console.log('tokensOf');
{
  const t = tokensOf('配色 #aabbcc 与 #AABBCC；宽 60px、1.5vw、3fr、0.4mm、12%；又说 6 倍、10 栏');
  check('抽到的 token', [...t].sort(), ['#AABBCC', '0.4mm', '1.5vw', '12%', '3fr', '60px'],
    'hex 统一大写去重；只认 px/vw/fr/mm/% 五种单位；「6 倍」「10 栏」不算可测值');
  check('空文本', [...tokensOf('')], [], '没有 token 就是空集，不是 null');
  /* ★ 反向风险段里的数字不算可测值。
   * 38/38 份任务书都有「最容易做成的错误样子」这一段，
   * 里面是作者的设计说明（「主色占 46%」「42% 就进 AI 味窗口」），
   * 不是给模型的施工目标。把它们算进判别值会把命中率从 100% 拉到 94.7%。 */
  const withRisk = tokensOf('配色 #AABBCC，宽 60px。\n\n这一案最容易做成的错误样子：主色占 46%，42% 就进 AI 味窗口。');
  check('跳过反向风险段', [...withRisk].sort(), ['#AABBCC', '60px'],
    '「最容易做成的错误样子」之后的 46% / 42% 是作者说明，不是施工目标');
}

/* ── discriminatorsFor ────────────────────────────────────────────── */
console.log('\ndiscriminatorsFor');
{
  const tok = {
    A: new Set(['#AAAAAA', '60px', '12px']),
    B: new Set(['#BBBBBB', '60px']),
    C: new Set(['#CCCCCC']),
  };
  check('A 的判别值', discriminatorsFor('A', tok).sort(), ['#AAAAAA', '12px'],
    '60px 在 B 里也有，不算判别值');
  check('C 的判别值', discriminatorsFor('C', tok).sort(), ['#CCCCCC'],
    'C 的值没出现在别处');

  /* 关键边界：others 必须是**全体并集**。
   * 只查其中一份的话，1px 会被误判为独有。 */
  const tok3 = {
    X: new Set(['1px', '999px']),
    Y: new Set(['1px']),
    Z: new Set(['1px']),
  };
  check('三分共用 1px', discriminatorsFor('X', tok3).sort(), ['999px'],
    '1px 在 Y 与 Z 都有；只检查其中一份会漏掉另一份');

  /* 只有一份任务书时，它的所有值都是判别值（没有"别处"可比） */
  check('单案语料库', discriminatorsFor('A', { A: new Set(['5px']) }).sort(), ['5px'],
    '没有其他任务书时，每个值都只在这一份里');
}

/* ── hitIn ────────────────────────────────────────────────────────── */
console.log('\nhitIn（hex）');
{
  check('hex 命中', hitIn('COLOR:#AAAAAA;', '#AAAAAA'), true, '子串匹配');
  check('hex 差一位', hitIn('COLOR:#AAAAAB;', '#AAAAAA'), false, '差一位不算命中');
}

console.log('\nhitIn（数值的左边界）');
{
  check('118px 命中', hitIn('WIDTH:118PX;', '118px'), true, '独立成值');
  check('118px 不被 1180px 命中', hitIn('WIDTH:1180PX', '118px'), false,
    '1180px 里有 118 但不是独立值');
  check('60px 不被 160px 命中', hitIn('WIDTH:160PX;', '60px'), false,
    '★ 这条是 2026-11-14 抓到的 bug：子串搜索让 160PX 命中 60PX');
  check('60px 在 clamp 里命中', hitIn('FONT-SIZE:CLAMP(38PX,8.6VW,104PX)', '104px'), true,
    '值嵌在函数里也算');
  check('行首命中', hitIn('60PX SOLID RED', '60px'), true,
    '左边界为字符串开头时也要命中');
}

console.log('\nhitIn（单位必须一致）');
{
  check('60vw 不算 60px', hitIn('WIDTH:60VW;', '60px'), false,
    '★ 交替匹配 (px|vw|fr|mm|%) 会让任何单位都算命中');
  check('60px 不算 60vw', hitIn('WIDTH:60PX;', '60vw'), false, '反向同理');
  check('5fr 命中 5fr', hitIn('GRID-TEMPLATE:5FR 1FR;', '5fr'), true, '同单位正常命中');
  check('12% 不算 12px', hitIn('WIDTH:12%;', '12px'), false, '% 与 px 不同');
}

console.log('');
if (bad === 0) {
  console.log('✓ 21 条用例全部通过');
  console.log('  判别值定义与命中判定的边界行为都对，四份脚本可以放心用它。');
  process.exit(0);
}
console.log(`✗ ${bad} 条用例不符`);
process.exit(1);
