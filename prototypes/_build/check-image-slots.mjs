#!/usr/bin/env node
/* 图片位宽高：提示词要求"带宽高属性"，但它自己从不给宽高。
 *
 * 【实测 —— 2026-11-22】
 *
 * `prompt-copy.js` 的末尾输出要求里写着：
 *
 *   「图片位置写成 <img src="images/占位-N.jpg">，**带该案实际可用的宽高属性**，
 *     并在页面上占出与属性一致的真实面积与比例。」
 *
 * 而实测 35 份提示词里 **0 份**给出任何图片位的宽高。
 *
 * 原型那边有：34/35 案的 `index.html` 里 `<img>` 带 width/height
 * （S10 是 1240×?、880×620，S09 是 300×300，S21 用 srcset）。
 * **数据在，但没传进提示词。**
 *
 * 后果在渲染层可见（见 `_probe/79-measurement-layer-audit.md` §三十八）：
 * 20 份产物里 6 份的「图片占版面份额」不到原型的 40%，
 * S21 最极端：6 个图片盒子 120×100，而原型同位置是 909×342 —— 面积差 19 倍。
 * 而 `score.mjs` 对 S21 的判词是「图片 6/5 达标 ✓」，因为它数的是标签个数。
 *
 * 【为什么这条不能自动修】
 *
 * 把原型里的 width/height 直接搬进提示词，会有两个问题：
 *   ① 原型的尺寸是**实拍图**的尺寸，店主手上没有那些图，他的图可能比例不同；
 *   ② 不同案对图片位的用法不同（S09 的 300×300 是角落锈斑，S10 的 880×620 是主图）。
 * 所以该传的是「**每个图片位占几栏、大致什么比例**」，不是原图的像素尺寸。
 *
 * 这条闸门**只报不判**：它报出"提示词要求了一件自己没给的信息"这个事实，
 * 以及每案原型里有没有可用数据。改不改、怎么改，是产品决定。
 *
 * 用法：
 *   node prototypes/_build/check-image-slots.mjs
 *   node prototypes/_build/check-image-slots.mjs --verbose
 *   node prototypes/_build/check-image-slots.mjs --selftest
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');
const VERBOSE = process.argv.includes('--verbose');

/* 从一段 HTML 里抽 <img> 的 width/height（含 srcset 的 w 描述符） */
function imgDims(html) {
  const out = [];
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const w = tag.match(/\bwidth\s*=\s*["']?(\d+)/i);
    const h = tag.match(/\bheight\s*=\s*["']?(\d+)/i);
    const srcset = tag.match(/srcset\s*=\s*["']([^"']*)["']/i);
    let sw = null;
    if (srcset) {
      const ws = [...srcset[1].matchAll(/(\d+)w\b/g)].map((x) => Number(x[1]));
      if (ws.length) sw = Math.max(...ws);
    }
    if (w && h) out.push({ w: Number(w[1]), h: Number(h[1]), via: 'attr' });
    else if (sw) out.push({ w: sw, h: null, via: 'srcset' });
  }
  return out;
}

/* 提示词里"图片那段"是否给出任何具体尺寸 */
function promptHasDims(prompt) {
  /* 只看图片约束那一段（含「图片位」/「图片位置」的行），免得把机制句里的
   * 锁条尺寸 `24×96px` 误当成图片位规格 —— 这个坑规划 Agent 踩过。 */
  const lines = prompt.split('\n').filter((l) => /图片位|图片位置|个\s*img/.test(l));
  if (!lines.length) return null;
  const text = lines.join('\n');
  return /\d+\s*[×x]\s*\d+|\bwidth\s*[:=]|\bheight\s*[:=]|\d+\s*fr\b/.test(text);
}

function selfTest() {
  const S = [];
  const eq = (n, g, w) => S.push([n, JSON.stringify(g) === JSON.stringify(w), g, w]);
  /* imgDims：属性写法 */
  eq('imgDims/width+height', imgDims('<img src="a" width="300" height="200">'), [{ w: 300, h: 200, via: 'attr' }]);
  /* srcset 的 w 描述符 */
  eq('imgDims/srcset 取最大 w', imgDims('<img src="a" srcset="a 278w, b 909w">'), [{ w: 909, h: null, via: 'srcset' }]);
  /* 没有尺寸的不算 */
  eq('imgDims/无尺寸返回空', imgDims('<img src="a" alt="x">'), []);
  /* promptHasDims：图片段里有 880×620 → true */
  eq('promptHasDims/有尺寸', promptHasDims('4. 这个版式有 6 个图片位，尺寸 880×620'), true);
  /* 只有"带宽高属性"这句空话 → false（这是现状） */
  eq('promptHasDims/只有空话', promptHasDims('图片位置写成 <img src="x">，带该案实际可用的宽高属性'), false);
  /* 机制句里的 24×96px 不算 —— 那行没有"图片位"字样 */
  eq('promptHasDims/机制句不算', promptHasDims('机制：14 枚 24×96px 横条首尾相扣'), null);
  const bad = S.filter(([, ok]) => !ok);
  for (const [n, ok, g, w] of S) {
    console.log(`  ${ok ? '✓' : '✗'} ${n}`);
    if (!ok) console.log(`      实得 ${JSON.stringify(g)}，期望 ${JSON.stringify(w)}`);
  }
  console.log(`\n自测：${S.length - bad.length}/${S.length} 通过`);
  return bad.length === 0;
}

if (process.argv.includes('--selftest')) {
  console.log('=== 图片位宽高闸门自测 ===');
  process.exit(selfTest() ? 0 : 1);
}

const win = {};
new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8'))(win);
const P = {};
new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8'))(P);
const stub = {
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }),
  addEventListener: () => {}, readyState: 'complete', body: { appendChild() {} },
};
const G = {
  STYLE_PROMPTS: P.STYLE_PROMPTS, SCHEMES: win.SCHEMES, document: stub,
  location: { href: 'http://x/', search: '', hash: '' },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  navigator: { clipboard: { writeText: async () => {} } },
  history: { replaceState() {} }, setTimeout, clearTimeout,
};
new Function('window', 'document', 'location', 'localStorage', 'navigator', 'history', 'setTimeout', 'clearTimeout',
  readFileSync(join(ROOT, 'prototypes/_selection/prompt-copy.js'), 'utf8'))(
  G, G.document, G.location, G.localStorage, G.navigator, G.history, setTimeout, clearTimeout);

let withPromptDims = 0, withProtoDims = 0, needButLack = 0, skipped = 0;
const lackIds = [];
console.log('图片位宽高：提示词给了没有 / 原型有没有\n');
for (const s of win.SCHEMES) {
  const prompt = G.buildStylePrompt(s.id, { biz: '一家修鞋配钥匙的小店', action: '打电话约个时间', have: 5 });
  const has = promptHasDims(prompt);
  if (has === null) { skipped++; continue; }   // 该案提示词没有图片段
  if (has) withPromptDims++;
  const ip = join(ROOT, 'prototypes', s.dir, 'index.html');
  if (!existsSync(ip)) continue;
  const dims = imgDims(readFileSync(ip, 'utf8'));
  if (dims.length) withProtoDims++;
  if (!has && dims.length) { needButLack++; lackIds.push(s.id); }
  if (VERBOSE) console.log(`  ${s.id}  提示词:${has ? '有' : '无'}  原型:${dims.length ? dims.length + ' 个带尺寸' : '无'}`);
}
console.log('');
console.log(`  ${withPromptDims} 案提示词给了图片位尺寸`);
console.log(`  ${withProtoDims} 案原型里 <img> 带尺寸`);
console.log(`  ${needButLack} 案「原型有尺寸但提示词没传」`);
if (lackIds.length) console.log(`  缺的：${lackIds.join(' ')}`);
if (skipped) console.log(`  （${skipped} 案提示词里没有图片段，跳过）`);
console.log('');
console.log('只报不判：该传的是"每个图片位占几栏、大致什么比例"，不是原图像素尺寸 ——');
console.log('原型里的 width/height 是实拍图的尺寸，店主手上没有那些图。');
/* 不 exit 1：这是产品决定，不是缺陷断言。 */
