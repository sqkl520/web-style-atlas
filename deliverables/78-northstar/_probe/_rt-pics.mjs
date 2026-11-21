#!/usr/bin/env node
/* 攻击 D：图片判据的假阴性路径 + 提示词三条句式覆盖。
 *
 * judgePictures 只用 `src="..."` 双引号数唯一图。下面逐条打：
 *   D1 src 单引号 / 无引号 / srcset / <picture> / CSS background-image
 *   D2 strict 分支的 "imgs === uniq"：同一张图用了 2 次但另有 3 张不同 → 该不该报？
 *   D3 zero 分支：CSS background-image 算不算"图片位"
 *   D4 三条句式的真实覆盖率（拿 35 份提示词跑一遍）
 */
import { judgePictures, judgeItems } from './_rt-scorelib.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');

let defects = 0;
const row = (name, got, want, detail) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) defects++;
  console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (!ok) console.log(`      实得 ${JSON.stringify(got)}，应为 ${JSON.stringify(want)}${detail ? ' ｜ ' + detail : ''}`);
};

const PALT = '4. 这个版式有 6 个图片位，但你只有 5 条内容：按你的内容放**不同的**真实图片，空出来的图片位改成留白或文字块。';
const PSTRICT = '4. 版式里至少要 4 个**不同的**图片位置（不是4 个 img 标签就够——同一张图重复用不算）。';
const PZERO = '4. 本案是零图片设计：整页不出现任何图片位，全用文字与色块承载，不要自己补图片。';

console.log('══ D1 图片计数：等价写法 ══');
const d1 = [
  ['单引号 src（5 张不同）', PALT, `<img src='a'><img src='b'><img src='c'><img src='d'><img src='e'>`, true],
  ['无引号 src', PALT, `<img src=a><img src=b><img src=c><img src=d><img src=e>`, true],
  ['SRC 大写属性', PALT, `<img SRC="a"><img SRC="b"><img SRC="c"><img SRC="d"><img SRC="e">`, true],
  ['srcset 代替 src', PALT, `<img srcset="a 1x, a2 2x"><img srcset="b 1x"><img srcset="c 1x"><img srcset="d 1x"><img srcset="e 1x">`, true],
  ['<picture><source> 写法', PALT, `<picture><source srcset=a><img src="p1"></picture><picture><source srcset=b><img src="p2"></picture><picture><source srcset=c><img src="p3"></picture><picture><source srcset=d><img src="p4"></picture><picture><source srcset=e><img src="p5"></picture>`, true],
];
for (const [name, p, h, want] of d1) {
  const r = judgePictures(p, h);
  row(name, r.hit, want, `got=${r.got} uniq=${r.uniq}（判据用 src="..." 双引号数唯一图）`);
}

console.log('\n══ D2 strict 分支：imgs === uniq 要求"每张图只用一次"是否过严 ══');
{
  /* 提示词要求「至少 4 个不同的图片位置」。放 6 个位，4 张不同图 + 其中 1 张复用在第 5 位。 */
  const r = judgePictures(PSTRICT, `<img src="a"><img src="b"><img src="c"><img src="d"><img src="a"><img src="b">`);
  console.log(`  6 个 img、其中 4 张不同（a,b,c,d 各至少一次）→ hit=${r.hit} got=${r.got} uniq=${r.uniq}`);
  row('满足"≥4 个不同图片位"却因复用被报', r.hit, true,
    '提示词只要求"至少 4 个不同的位置"，并未禁止在额外位置复用；判据额外加了 imgs===uniq');
}

console.log('\n══ D3 zero 分支：CSS background-image 算不算图片位 ══');
{
  const r = judgePictures(PZERO, `<div class="hero"></div><img src="x">`);
  console.log(`  零图设计 + 1 个 <img> → hit=${r.hit}（正确）`);
  const r2 = judgePictures(PZERO, `<style>.hero{background-image:url(photo.jpg)}</style><div class="hero"></div>`);
  console.log(`  零图设计 + background-image:url(photo.jpg) → hit=${r2.hit} got=${r2.got}（判据只数 <img>）`);
  row('零图设计里出现背景图应算违规', r2.hit, false,
    '提示词说"整页不出现任何图片位"，背景图就是一个图片位');
}

console.log('\n══ D4 三条句式对 35 份提示词的覆盖率 ══');
{
  const W = {};
  new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8'))(W);
  const P2 = {};
  new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8'))(P2);
  const stub = {
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }),
    addEventListener: () => {}, readyState: 'complete', body: { appendChild() {} },
  };
  const G = {
    STYLE_PROMPTS: P2.STYLE_PROMPTS, SCHEMES: W.SCHEMES, document: stub,
    location: { href: 'http://x/', search: '', hash: '' },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { clipboard: { writeText: async () => {} } },
    history: { replaceState() {} }, setTimeout, clearTimeout,
  };
  new Function('window', 'document', 'location', 'localStorage', 'navigator', 'history', 'setTimeout', 'clearTimeout',
    readFileSync(join(ROOT, 'prototypes/_selection/prompt-copy.js'), 'utf8'))(
    G, G.document, G.location, G.localStorage, G.navigator, G.history, setTimeout, clearTimeout);

  const byBranch = {};
  for (const s of W.SCHEMES) {
    for (const have of [1, 3, 5, 20]) {
      const prompt = G.buildStylePrompt(s.id, { biz: '一家修鞋配钥匙的小店', action: '打电话约个时间', have });
      const r = judgePictures(prompt, '');
      const k = r.branch;
      byBranch[k] = (byBranch[k] || 0) + 1;
      if (k === 'none') console.log(`  ⚠️ none: ${s.id} have=${have}`);
    }
  }
  console.log(`  35 案 × 4 个 have → 分支分布 ${JSON.stringify(byBranch)}`);
  row('三条句式覆盖全部 (案 × have) 组合', byBranch.none || 0, 0);
}

console.log(`\n缺陷计数 ${defects}`);