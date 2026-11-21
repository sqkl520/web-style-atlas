#!/usr/bin/env node
/* 攻击 B：等价形式矩阵 —— 判据量字面，实现用等价写法。
 *
 * 每条都是「同样的视觉效果、不同的 CSS 字面」。判据应该报违规的，
 * 如果漏报 = 假阴性（危险方向）；判据不该报的，如果报了 = 假阳性。
 *
 * 期望值一栏写的是「按评分器自己的规则承诺」，不是我的偏好。
 */
import { judgeRadius, judgeLineWidth, judgeFontChain, judgeDefaultFontStack, judgeItems } from './_rt-scorelib.mjs';

const P = [
  '圆角：全站一律 0，卡片全部方角。',
  '线宽只用这几级：1px、3px，全站线条都从这几级里取。',
  '字体：标题按这个顺序取第一个可用的：Noto Sans SC → Source Han Sans SC。正文同理，按序取：Noto Sans SC → Source Han Sans SC。',
  '不要用 上面两条链之外的字体。也不要跳过上面这两条链回退成系统默认无衬线。',
].join('\n');
const radiusP = P.split('\n')[0];
const lwP = P.split('\n')[1];
const fontP = P;

let defects = 0;
const row = (name, got, want, gotStr) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) defects++;
  console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (!ok) console.log(`      实得 ${gotStr ?? JSON.stringify(got)}，按判据自己的规则应为 ${JSON.stringify(want)}`);
};

console.log('══ B1 圆角：哪些非 0 写法被漏掉 / 哪些 0 被误报 ══');
const radiusCases = [
  ['50% 是圆（非 0）', 'border-radius:50%', 1],
  ['9999px 是圆（非 0）', 'border-radius:9999px', 1],
  ['.5rem 非 0', 'border-radius:.5rem', 1],
  ['calc(0px) 是 0', 'border-radius:calc(0px)', 0],
  ['0/0 双值语法（全 0）', 'border-radius:0/0', 0],
  ['0px 0px 0px 0px / 0px（全 0）', 'border-radius:0px 0px 0px 0px/0px', 0],
  ['--r:4px 后再 border-radius:var(--r)', 'border-radius:var(--r)', 1],
  ['大写 ZERO 关键字？不存在', 'border-radius:initial', 1],
  ['负数 -0px（等于 0）', 'border-radius:-0px', 0],
];
for (const [name, decl, want] of radiusCases) {
  const r = judgeRadius(radiusP, `<style>.a{${decl}}</style>`);
  row(name, r.violations, want, `${r.violations} 条违规，samples=${JSON.stringify(r.samples)}`);
}

console.log('\n══ B2 线宽：越界值的等价写法 ══');
const lwCases = [
  ['em 单位 0.25em(=4px) 越界', 'border-bottom:0.25em solid #000', ['4px']],
  ['rem 单位越界', 'border-bottom:0.5rem solid', ['8px']],
  ['裸 0（无单位）是合法 0，不该报', 'border-bottom:0 solid', []],
  ['2px 越界（允许 1/3）', 'border:2px solid', ['2px']],
  ['2PX 大写单位', 'border:2PX solid', ['2px']],
  ['border-width 属性', 'border-width:2px', ['2px']],
  ['border-block-start 逻辑属性', 'border-block-start:2px solid', ['2px']],
  ['内联 border="2"（HTML 属性，非 CSS）', 'border="2"', []],
];
for (const [name, decl, want] of lwCases) {
  const r = judgeLineWidth(lwP, `<style>.a{${decl}}</style>`);
  row(name, r.outside, want, `outside=${JSON.stringify(r.outside)} used=${r.used}`);
}

console.log('\n══ B3 字体链：等价写法与漏报 ══');
const fontCases = [
  ['单引号字体名', `<style>.a{font-family:'Noto Sans SC',sans-serif}</style>`, []],
  ['无引号多词字体名', '<style>.a{font-family:Noto Sans SC,sans-serif}</style>', []],
  ['Inter 在链首 → 默认栈要报', '<style>.a{font-family:Inter,sans-serif}</style>', ['Inter']],
  ['Arial 在链首 → 默认栈要报', '<style>.a{font-family:Arial,sans-serif}</style>', ['Arial']],
  ['Helvetica Neue 在链首 → 默认栈要报', '<style>.a{font-family:"Helvetica Neue",sans-serif}</style>', ['Helvetica Neue']],
  ['-apple-system 在链首 → 默认栈要报', '<style>.a{font-family:-apple-system,BlinkMacSystemFont,sans-serif}</style>', ['-apple-system']],
  ['papyrus 小写（链外）', '<style>.a{font-family:papyrus}</style>', ['papyrus']],
  ['"Noto Sans SC " 带尾空格', '<style>.a{font-family:"Noto Sans SC "}</style>', []],
];
for (const [name, html, want] of fontCases) {
  const r = judgeFontChain(fontP, html);
  row('链外判定 · ' + name, r.outside, want, `outside=${JSON.stringify(r.outside)}`);
}
console.log('  ── 默认栈 ──');
for (const [name, html, want] of fontCases) {
  const r = judgeDefaultFontStack(fontP, html);
  row('默认栈判定 · ' + name, r.hits, want, `hits=${JSON.stringify(r.hits)}`);
}

console.log('\n══ B4 条目数：「取最接近 expect」的选标签有没有反噬 ══');
const PIT = '1. 这个版式设计时排了 20 个条目——这是版式的规模。\n2. 你手上有 5 条内容，就排 5 条。';
const itemCases = [
  ['内容在 div，页面有 6 个 section 外壳 → 应该判不了', '<div class="item"></div>'.repeat(5) + '<section></section>'.repeat(6), null],
  ['内容 5 条在 div，但导航有 5 个 <li> → li 恰好命中，误判 ✓', '<div class="item"></div>'.repeat(5) + '<nav><li></li>'.repeat(5) + '</nav>', true],
  ['真实内容 12 条在 ul/li，另有 5 个 figure 装饰 → 选 figure 误判 ✓', '<li></li>'.repeat(12) + '<figure></figure>'.repeat(5), true],
  ['真实内容 20 条，article=20 → ✗', '<article></article>'.repeat(20), false],
];
for (const [name, html, wantHit] of itemCases) {
  const r = judgeItems(PIT, html);
  row(name, r.hit, wantHit, `hit=${r.hit} 选中 <${r.gotTag}>=${r.got} counts=${JSON.stringify(r.counts)}`);
}

console.log(`\n缺陷计数 ${defects}`);