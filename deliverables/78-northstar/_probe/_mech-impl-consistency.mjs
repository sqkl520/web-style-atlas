#!/usr/bin/env node
/* 两套「机制数值」实现的一致性检查：check-prompts 与 mech-fidelity。
 *
 * 【为什么需要 —— 这个仓库已经吃过四次亏】
 *
 * `prompt-copy.js` 上方的注释记过：
 *
 *   「同一组逻辑曾在四份脚本里各写一份，2026-11-14 同一个 bug 犯了四次
 *     （子串搜索让 160PX 命中 60PX）。两份实现跑通不等于它们一致。」
 *
 * 现在「从 CSS 里抽出机制数值」这件事有两套实现：
 *
 *   · `prototypes/_build/check-prompts.mjs` 的 `mechSourceNumbers()`
 *     —— 判**原型**的机制句有没有落实
 *   · `deliverables/78-northstar/_probe/_mech-fidelity.mjs` 的 `declaredNumbers()`
 *     —— 判**盲测产物**的机制句有没有落实
 *
 * 我是照抄后者写的前者，但照抄不是保证。改了其中一个、忘了另一个，
 * 就会出现「原型侧绿、产物侧红」这种没人能解释的分歧 —— 而两边都自称
 * 在量同一件事。
 *
 * 【做法】
 *
 * 不 import（两边都不是模块化出口），而是把两段源码切出来，用同一批
 * 样本各跑一遍，逐样本比结果。样本覆盖：
 *   · opacity 归一（`.14` 要认作 14%），含 min() 包裹的那种
 *   · px / mm 数值
 *   · SVG stroke-width
 *   · 子串陷阱（`padding-bottom:16px` 不能被截成 6px）
 *
 * 【局限】
 *
 * 用的是"切源码 + new Function"，不是真的导入。如果哪天有人把函数改名为
 * 局部函数、或者挪进一个 IIFE，切出来的源码会跑不通 —— 那时这个脚本会
 * 报"找不到函数"，而不是静默通过。这是有意设计成失败可见的。
 *
 * 用法：node _mech-impl-consistency.mjs
 * 退出码：一致 0；不一致 1；切不出源码 2
 */
import { readFileSync } from 'node:fs';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');

/* 从源码里切出一个具名函数体（花括号配对）。 */
function sliceFunction(src, name) {
  const start = src.indexOf(`function ${name}`);
  if (start < 0) return null;
  let depth = 0, i = src.indexOf('{', start), end = -1;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (!depth) { end = i + 1; break; } }
  }
  return end > 0 ? src.slice(start, end) : null;
}

const A_SRC = readFileSync(`${ROOT}/prototypes/_build/check-prompts.mjs`, 'utf8');
const B_SRC = readFileSync(`${ROOT}/deliverables/78-northstar/_probe/_mech-fidelity.mjs`, 'utf8');

const aBody = sliceFunction(A_SRC, 'mechSourceNumbers');
const bBody = sliceFunction(B_SRC, 'declaredNumbers');
if (!aBody || !bBody) {
  console.error(`切不出函数：${!aBody ? 'check-prompts.mechSourceNumbers' : ''} ${!bBody ? 'mech-fidelity.declaredNumbers' : ''}`);
  console.error('如果函数被改名或挪进 IIFE，改这个脚本的取法，不要删这条检查。');
  process.exit(2);
}

const A = new Function(`${aBody}\nreturn mechSourceNumbers;`)();
const B = new Function(`${bBody}\nreturn declaredNumbers;`)();

/* 样本。每条都对应一个真实踩过的坑，写在右边。 */
const SAMPLES = [
  ['opacity:.14', 'opacity 归一：S07 的「14%」就是这样写的'],
  ['opacity:min(.14,calc(1-.2))', 'opacity 被函数包裹时也要认'],
  ['opacity: 0.055', '带前导零的写法'],
  ['width:16px', '普通 px'],
  ['margin:7px', '普通 px'],
  ['padding-bottom:16px', '子串陷阱：16px 不能被截成 6px'],
  ['stroke-width="0.5"', 'SVG 描边宽度'],
  ['r="12"', 'SVG 圆角半径'],
  ['gap:0.4mm', 'mm 单位'],
  ['height:144px', 'S19 的开口高度'],
  ['width:min(1440px,100%)', '1440 不能被当成 144'],
];

let diff = 0;
console.log('两套「机制数值」实现的一致性\n');
console.log('样本'.padEnd(34) + 'check-prompts'.padEnd(28) + 'mech-fidelity');
for (const [src, note] of SAMPLES) {
  const a = A(src, {});
  const b = B(src);
  const fa = `${[...a.len].sort().join(',')} | ${[...a.pct].sort().join(',')}`;
  const fb = `${[...b.len].sort().join(',')} | ${[...b.pct].sort().join(',')}`;
  const same = fa === fb;
  if (!same) diff++;
  console.log(src.padEnd(34) + fa.padEnd(28) + fb + (same ? '' : '   ← 不一致'));
  if (!same) console.log(`      样本用途：${note}`);
}
console.log('');
if (diff === 0) {
  console.log(`✓ ${SAMPLES.length} 个样本全部一致 —— 两套实现现在等价`);
  console.log('  （但这不是保证。改了任何一边，跑这一条。）');
  process.exit(0);
} else {
  console.log(`✗ ${diff} 个样本不一致 —— 两套实现已经漂移，它们自称在量同一件事`);
  process.exit(1);
}
