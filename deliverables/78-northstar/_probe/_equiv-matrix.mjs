#!/usr/bin/env node
/* 等价形式矩阵：同一个概念，CSS 里有多少种写法，判据认不认。
 *
 * 【为什么需要 —— 这一轮 8 处误报里有 7 处同源】
 *
 * 上一轮修了 8 处判据误报，七处是同一个模式：**判据量字面，实现用等价形式**。
 *
 *   #  判据        字面          实际实现
 *   1  圆角=0      `0`           `0 !important`
 *   2  线宽        `6px`         从 `padding-bottom:16px` 截出
 *   3  无阴影      有 box-shadow  模糊半径 0（画线）
 *   4  渐变受限    有 gradient    两端同色（画线）
 *   5  字体链      `Glow Sans SC` `GlowSansSC` / 链尾回退 / 手写
 *   6  渐变受限    `color 0 3px`  双位置 `color start end`
 *   7  渐变受限    `4px, 4.1px`   抗锯齿交叠
 *   8  渐变受限    `transparent…` 纹理
 *
 * 修了 8 次，但**没有任何机制防止第 9 次**。这个脚本就是那个机制。
 *
 * 【做法】
 *
 * 对每个 CSS 概念，列出一组**等价写法**（同一个渲染效果的不同编码），
 * 逐条喂给判据，断言结果一致。
 *
 * 双向都测：
 *   · 假阳性方向 —— 合规的写法不该被判违规
 *   · 假阴性方向 —— 违规的写法必须被判违规
 *
 * 【这张表会过期吗】
 *
 * 会。所以每条用例都带一个 `why`（为什么这几种写法等价），
 * 而且这张表是**从真实产物/原型里抽出来的写法**，不是凭空穷举。
 * 加新写法时要在 `why` 里写清在哪份文件里见过。
 *
 * 用法：
 *   node deliverables/78-northstar/_probe/_equiv-matrix.mjs
 *   node deliverables/78-northstar/_probe/_equiv-matrix.mjs --verbose
 */
import { readFileSync } from 'node:fs';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const SRC = readFileSync(ROOT + '/deliverables/78-northstar/_blindtest/score.mjs', 'utf8');

/* 从 score.mjs 里切出判据函数。切法：按函数名找起止行（用下一行 `function ` 或文件尾做边界）。
 *
 * ⚠️ 不用花括号配对 —— 正则字面量里的 `{` 会骗过配对器（试过，切出来的代码语法错）。
 * 用「下一个顶层 function」做边界更稳，代价是要保证这些函数在文件里连续排列。 */
function sliceFns(src, names) {
  const lines = src.split('\n');
  const out = [];
  for (const name of names) {
    const start = lines.findIndex((l) => l.startsWith(`function ${name}(`));
    if (start < 0) throw new Error(`找不到函数 ${name}`);
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      if (/^(function |const |let |var )/.test(lines[i])) { end = i; break; }
    }
    out.push(lines.slice(start, end).join('\n'));
  }
  return out.join('\n');
}

/* 依赖的常量也要一起切进来 */
function sliceConst(src, name) {
  const lines = src.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`const ${name}`));
  if (start < 0) throw new Error(`找不到常量 ${name}`);
  let end = start + 1;
  while (end < lines.length && !/;$/.test(lines[end - 1])) end++;
  return lines.slice(start, end).join('\n');
}

const CODE = [
  sliceConst(SRC, 'COLOR_TOKEN'),
  sliceConst(SRC, 'GENERIC_FAMILIES'),
  sliceConst(SRC, 'DEFAULT_STACK'),
  sliceFns(SRC, ['colorArgs', 'isDecorativeLine', 'scoreGradient', 'judgeRadius', 'judgeLineWidth', 'judgeFontChain', 'judgeDefaultFontStack']),
].join('\n\n');

/* stripCssComments 被 judgeFontChain 等依赖，单独取（它在别的位置） */
const STRIP = (() => {
  const lines = SRC.split('\n');
  const s = lines.findIndex((l) => l.startsWith('function stripCssComments'));
  return lines.slice(s, s + 3).join('\n');
})();

const M = new Function(`${STRIP}\n${CODE}\nreturn { scoreGradient, judgeRadius, judgeLineWidth, judgeFontChain, judgeDefaultFontStack };`)();

/* ── 用例表 ────────────────────────────────────────────────────────────
 * 每条形如：
 *   { concept, variants: [[写法, 期望, why], ...] }
 * 期望值是**判据应该给出的结论**，不是"现在给出的结论"。
 * 如果某条不过，先问"是判据错了还是我的期望错了"。 */
const P_RADIUS = '3. 圆角：全站一律 0，卡片、按钮、图片、标签全部方角。';
const P_LW = '5. 线宽只用这几级：1px、1.25px、2px，全站线条都从这几级里取。';
const P_GRAD = '需要做渐变或纹理时只用**同一色系里明度接近的两档**，跨度不超过一档，不要从深色直接过渡到浅色。';
const P_FONT = '2. 字体：标题按这个顺序取第一个可用的：Noto Sans SC → Source Han Sans SC（前一个缺字就用下一个）。正文同理，按序取：Noto Sans SC → Source Han Sans SC。编号/价格等数字用等宽 Martian Mono、tabular-nums 右对齐。';
const P_STACK = '也不要跳过上面这两条链回退成系统默认无衬线。';

const CASES = [
  {
    concept: '圆角 = 0',
    probe: (css) => M.judgeRadius(P_RADIUS, `<style>.x{${css};}</style>`).violations,
    variants: [
      ['border-radius:0', 0, '最直白'],
      ['border-radius:0px', 0, '带单位（等价写法）'],
      ['border-radius:0 0 0 0', 0, '四值全 0（S21 来源）'],
      ['border-radius:0 !important', 0, '带 !important（S21 实测误报）'],
      ['border-radius:4px', 1, '真的非 0'],
      ['border-radius:0 0 4px 0', 1, '单角非 0'],
    ],
  },
  {
    concept: '线宽允许级',
    probe: (css) => M.judgeLineWidth(P_LW, `<style>.x{${css};}</style>`).outside.length,
    variants: [
      ['border:1px solid #000', 0, '在最窄允许级'],
      ['border-top:1.25px solid #000', 0, '带小数（提示词里就这么写）'],
      ['border-bottom:2px solid #000', 0, '简写带 style/color'],
      ['border:3px solid #000', 1, '超出允许级'],
      ['padding-bottom:16px', 0, '不是 border，不该被抓（曾从 16px 截出 6px）'],
    ],
  },
  {
    concept: '渐变 = 画线（不该算违规）',
    probe: (css) => M.scoreGradient(P_GRAD, `<style>.x{${css};}</style>`).hits,
    variants: [
      ['background:linear-gradient(#888,#888)', 0, '同色两端（画硬线）'],
      ['background:linear-gradient(to right,var(--a) .5px,transparent .5px)', 0, '硬边透明（S15）'],
      ['background:repeating-linear-gradient(transparent 0,transparent 7px,#333 8px)', 0, '扫描线（S05）'],
      ['background:linear-gradient(45deg,transparent 0 26px,rgba(1,2,3,.03) 26px 28px)', 0, '2px 窄条 + rgba（S12）'],
      ['background:linear-gradient(#111,#EEE)', 1, '真渐变，必须报'],
      ['background:linear-gradient(rgba(0,0,0,.9) 0%,rgba(255,255,255,.1) 100%)', 1, 'rgba 真过渡'],
    ],
  },
  {
    concept: '字体链',
    probe: (css) => M.judgeFontChain(P_FONT, `<style>.x{${css};}</style>`).outside.length,
    variants: [
      ['font-family:"Noto Sans SC"', 0, '在链上'],
      ['font-family:NotoSansSC', 0, '无空格写法（同一字体的两种拼法）'],
      ['font-family:"Martian Mono"', 0, '等宽在链上'],
      ['font-family:"Martian Mono","Courier New",monospace', 0, '链尾回退不算违规'],
      ['font-family:"Courier New",sans-serif', 1, '首位链外要报'],
      ['font-family:"Papyrus"', 1, '真链外'],
    ],
  },
  {
    concept: '系统默认字体',
    probe: (css) => M.judgeDefaultFontStack(P_STACK, `<style>.x{${css};}</style>`).hits.length,
    variants: [
      ['font-family:Inter', 1, 'R-07 黑名单'],
      ['font-family:system-ui', 1, 'R-07 黑名单'],
      ['font-family:"Noto Sans SC"', 0, '具体中文字体，不是默认栈'],
      ['font-family:"Martian Mono",sans-serif', 0, '通用回退不算'],
    ],
  },
];

let total = 0, bad = 0;
const failures = [];
console.log('等价形式矩阵：同一个概念的不同写法，判据给出同一结论？\n');
for (const c of CASES) {
  console.log(`── ${c.concept} ──`);
  for (const [css, want, why] of c.variants) {
    total++;
    let got;
    try { got = c.probe(css); } catch (e) { got = 'ERR:' + e.message.slice(0, 40); }
    const ok = got === want;
    if (!ok) { bad++; failures.push({ concept: c.concept, css, want, got, why }); }
    console.log(`  ${ok ? '✓' : '✗'} ${css.padEnd(62)} 期望 ${want} 实得 ${got}`);
    if (!ok) console.log(`      用途：${why}`);
  }
  console.log('');
}
console.log(`${total - bad}/${total} 通过`);
if (bad) {
  console.log(`\n✗ ${bad} 条不过 —— 先问「是判据错了还是我的期望错了」，`);
  console.log('  不要为了让这条绿而改期望值。');
  process.exit(1);
}
