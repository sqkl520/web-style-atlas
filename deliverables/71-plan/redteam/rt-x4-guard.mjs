/* 新问题④：守卫不对称 —— 链 B 有色板守卫，链 A 没有。
 *
 * check-prompts.mjs:252 有一条断言 `palette-not-in-css`：
 *   「提示词列了 N 个 color，但 style.css/index.html 里查不到声明」
 * 也就是说 **prompts.js 的 palette 每个色都必须真的在样式面里出现**，否则闸门红。
 *
 * 而 data.js 的 palette 没有等价的外部守卫 ——
 * collect-schemes.mjs:480 的 `inStyle` 只是生成器内部的一道 filter，
 * 它的结论没有人复核（49b5ac6 那次是人工核对「修前 4 案 → 修后 0 案」）。
 *
 * 本探针把 check-prompts 的同一条判据施加到 data.js 上，看能不能抓到东西。
 * 这也是「如果只能做一件事」的证据基础：补一个外部守卫，比合并数据源便宜得多。
 *
 *   node deliverables/71-plan/redteam/rt-x4-guard.mjs
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { P, loadData, loadPrompts, h1, h2 } from './rt-lib.mjs';

/* 与 collect-schemes.mjs:93-115 同一个「样式面」定义 */
function styleSurface(dir) {
  const parts = [];
  const css = join(P, dir, 'style.css');
  if (existsSync(css)) parts.push(readFileSync(css, 'utf8'));
  const html = join(P, dir, 'index.html');
  if (existsSync(html)) {
    const t = readFileSync(html, 'utf8');
    for (const m of t.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) parts.push(m[1]);
    for (const m of t.matchAll(/\bstyle\s*=\s*"([^"]*)"/gi)) parts.push(m[1]);
    for (const m of t.matchAll(/\bstyle\s*=\s*'([^']*)'/gi)) parts.push(m[1]);
    for (const m of t.matchAll(/\b(?:fill|stroke|stop-color|flood-color|color|lighting-color)\s*=\s*["']([^"']*)["']/gi)) parts.push(m[1]);
  }
  const ad = join(P, dir, 'assets');
  if (existsSync(ad)) for (const f of readdirSync(ad)) if (/\.svg$/i.test(f)) parts.push(readFileSync(join(ad, f), 'utf8'));
  return parts.join('\n');
}
const inSurface = (s, h) => new RegExp(h + '(?![0-9A-Fa-f])', 'i').test(s);

const data = loadData();
const prompts = loadPrompts();
const w = {};
new Function('window', readFileSync(join(P, '_selection', 'prompts.js'), 'utf8'))(w);
const pMap = new Map(prompts.map((s) => [s.id, s]));

h1('守卫对称性：同一条判据施加到两条链上');
let dBad = 0, pBad = 0;
const dFail = [], pFail = [];
for (const s of data) {
  const surf = styleSurface(s.dir);
  const dMiss = (s.palette || []).filter((h) => !inSurface(surf, h));
  if (dMiss.length) { dBad++; dFail.push({ id: s.id, miss: dMiss }); }
  const raw = String((pMap.get(s.id) || {}).dna?.palette || '');
  const pHex = [...raw.matchAll(/#[0-9A-Fa-f]{6}/g)].map((x) => x[0].toUpperCase());
  const pMiss = pHex.filter((h) => !inSurface(surf, h));
  if (pMiss.length) { pBad++; pFail.push({ id: s.id, miss: pMiss }); }
}

h2('链 A（data.js）：palette 里有没有"样式面查不到"的色');
console.log(`不通过的案：${dBad}/30`);
for (const x of dFail) console.log(`  ${x.id}: ${x.miss.join(' ')}`);
if (!dBad) console.log('  （0 —— 说明 data.js 当前是干净的，但这靠的是生成器内部 filter，不是外部守卫）');

h2('链 B（prompts.js）：palette 里有没有"样式面查不到"的色');
console.log(`不通过的案：${pBad}/30`);
for (const x of pFail) console.log(`  ${x.id}: ${x.miss.join(' ')}`);

h2('结论');
console.log('check-prompts.mjs:252 已经在守链 B 的这一条；链 A 没有任何等价的外部断言。');
console.log('「补一条断言让 data.js 的 palette 也过同一条判据」= 新增一个只读检查器，');
console.log('不碰 collect-schemes.mjs、不碰 P 会变的 22 案、不需要改 data.js。');

/* 附：check-prompts 的配色段守卫覆盖到什么程度 */
h2('check-prompts.mjs 的配色断言清单');
const cp = readFileSync(join(P, '_build', 'check-prompts.mjs'), 'utf8').split('\n');
cp.forEach((l, i) => {
  if (/add\('(FAIL|WARN)'.*palette/.test(l)) console.log(`  L${i + 1}: ${l.trim().slice(0, 140)}`);
});
