#!/usr/bin/env node
/* 评分器盲区实测（2026-11-21）。
 *
 * 目的：证明 deliverables/78-northstar/_blindtest/score.mjs 的两条结构判据
 * 在四个已测案上**一个都没真正判过**，而不是"判了但通过"。
 *
 * 为什么必须区分"通过"和"没判"：
 *   这是本仓库记录的第 1 类缺陷 —— 闸门什么都没读到，却报了个干净的数。
 *   第一轮盲测报告写的是"四案五类判据全过"，但 ④ 结构那一类
 *   在两案上输出的是"（启发式，仅供参考）"，在另两案上**整行不存在**。
 *   两者都不是通过。
 *
 * 用法：node deliverables/78-northstar/_probe/_scorer-blindspot.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const BT = join(ROOT, 'deliverables/78-northstar/_blindtest');

/* 与 score.mjs 逐字相同的两条正则 —— 复制而非 import 是有意的：
   如果哪天 score.mjs 改了正则而这里没改，这个探针会失效而不报错。
   所以下面每条都用 score.mjs 的真实输出做交叉验证（见"交叉验证"段）。 */
const RE_ITEMS = /这个版式设计时排了\s*(\d+)\s*个条目/;
const RE_PICS_STRICT = /至少要\s*(\d+)\s*个\*{0,2}不同的\*{0,2}图片位置/;

/* 提示词里实际存在的**两种**图片句式。第二种是 have>0 && have<minPics 时走的
   分支（prompt-copy.js:1152），评分器完全没覆盖。 */
const RE_PICS_ALT = /这个版式有\s*(\d+)\s*个图片位，但你只有\s*(\d+)\s*条内容/;

const ids = ['S01', 'S13', 'S19', 'S34'];
let defects = 0;

console.log('═'.repeat(72));
console.log('评分器结构判据盲区实测');
console.log('═'.repeat(72));

for (const id of ids) {
  const dir = join(BT, id);
  const promptPath = join(dir, '_prompt.txt');
  const htmlPath = existsSync(join(dir, 'index.html')) ? join(dir, 'index.html') : join(dir, 'out.html');
  if (!existsSync(promptPath) || !existsSync(htmlPath)) {
    console.log(`\n${id}: 产物不全，跳过`);
    continue;
  }
  const prompt = readFileSync(promptPath, 'utf8');
  const html = readFileSync(htmlPath, 'utf8');

  const itemM = prompt.match(RE_ITEMS);
  const strictM = prompt.match(RE_PICS_STRICT);
  const altM = prompt.match(RE_PICS_ALT);

  /* img 计数必须容忍属性换行 —— S01 的四个 <img 都带着换行后的属性，
     评分器用的 /<img[\s>]/ 能数到，我先前手写的 grep 数不到，记在这里。 */
  const imgs = (html.match(/<img[\s>]/g) || []).length;
  const uniqSrc = new Set(html.match(/src="[^"]*"/g) || []).size;

  console.log(`\n── ${id} ──`);
  if (itemM) {
    console.log(`  条目判据   提示词说 ${itemM[1]} 个（这是**版式规模**，不是内容量）`);
  } else {
    console.log(`  条目判据   ✗ 正则没匹配到 —— 这一类没判`);
    defects++;
  }
  if (strictM) {
    console.log(`  图片判据   strict 分支命中，要 ${strictM[1]} 个 → 实得 ${imgs} 个 img / ${uniqSrc} 个唯一 src`);
  } else if (altM) {
    console.log(`  图片判据   ✗ strict 分支没命中；提示词走的是另一句：「${altM[0].trim()}」`);
    console.log(`             评分器对这一句的输出是**整行不存在** → 没判，不是通过`);
    console.log(`             实际 HTML：${imgs} 个 img / ${uniqSrc} 个唯一 src`);
    defects++;
  } else {
    console.log(`  图片判据   ✗ 两种句式都没匹配到 → 没判`);
    defects++;
  }
}

console.log('\n' + '═'.repeat(72));
console.log(`结论：找到 ${defects} 处"没判却被读成通过"的结构判据。`);
console.log(`
这两个问题的性质不同：

① 条目判据 —— 量错了对象（第 4 类缺陷）。
   提示词原文：「这个版式设计时排了 20 个条目——这是版式的**规模**，
   不是你的内容量。」紧接着：「你手上有 5 条内容，就排 5 条」。
   而评分器拿 HTML 里的 <article> 数量去比 20。
   提示词明确要求 AI **不要**排 20 条，评分器却按 20 条去判。
   实测 S19：AI 排了 5 条（完全遵照提示词），评分器报"最接近 article=5"。

② 图片判据 —— 只覆盖了一条分支（第 1 类缺陷）。
   prompt-copy.js 有两条图片句式：
     · have==0 或 have>=minPics → 「至少要 N 个不同的图片位置」
     · 0 < have < minPics        → 「这个版式有 N 个图片位，但你只有 M 条内容」
   评分器只认第一条。而 acp-run.mjs 把 have 写死成 5，
   S01(minPics=6) 和 S19(minPics=6) 走的正是第二条 → 这一行**根本不打印**。

后果：第一轮报告「四案五类判据全过」里，④ 结构那一类
实际是 2 案没判、2 案判错对象。五类里最弱的一类，恰好是最没被判过的一类。
`);
process.exit(defects > 0 ? 0 : 0);
