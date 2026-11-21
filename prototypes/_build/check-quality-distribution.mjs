#!/usr/bin/env node
/* 质量分布闸门：当一案声称"缩进对应内容重量"时，实现里缩进和重量到底有没有关系？
 *
 * 【为什么需要它 —— 2026-11-21 实测】
 *
 * S34 的 `risk` 字段写着一句可证伪的话：
 *
 *   「本页的漂移幅度只有 7%，且每一档都对应一个可解释的重量（**字少的浮得远**），
 *     这让它读起来是"有意"而不是"失控"。」
 *
 * 这句话**进了提示词**（35/35 案的 risk 都进提示词），所以 AI 会照它做。
 * 但它是个可量的主张，可以验。
 *
 * 实测原型 `prototypes/S34-graphite-zero-photo-index/index.html`：
 *
 *   块   缩进    字数
 *   d1   0%     130
 *   d2   3%     110
 *   d3   5.5%   108
 *   d4   2%     128   ← 缩进小却字数多
 *   d5   7%     104
 *   d6   4%     115
 *   d7   1%      74   ← 缩进很小却字数最少，整条规律的反向
 *
 * Spearman ρ = **−0.43**。去掉 d7 之后是 **−0.94**（几乎完美）。
 * 也就是说：**规律本身成立，但 d7 那一块是坏点。**
 *
 * 而盲测产物 `_blindtest/S34-r2/index.html` 的 ρ 是别的值 —— 它把
 * 七个缩进值都写对了（0/3/5.5/2/7/4/1%），但加了一句
 *   `width: calc(100% - var(--indent))`
 * 于是每一块右边缘对齐，缩进退化成"右边距"，"浮起"的效果消失。
 * 原型只设 `margin-left`，不设 width。
 *
 * 【判据】
 *
 * 对每个声称了「重量/字数/长短 与 缩进/大小/档位 相关」的案：
 *   1. 从原型 HTML 里取每个单元的缩进值与文本长度；
 *   2. 算 Spearman ρ；
 *   3. 期望方向（"字少的浮得远" → ρ 应为负）与强度都报出来。
 *
 * **只报不判。** 理由：ρ 的合格线取决于每个案自己的说法，而说法是中文散文。
 * 这一版先把数算出来、把坏点指出来，等看得够多了再定线。
 * 这是本仓库对判据的一贯做法（§"先只报不判，看误判率再升级"）。
 *
 * 用法：
 *   node prototypes/_build/check-quality-distribution.mjs
 *   node prototypes/_build/check-quality-distribution.mjs --verbose
 *   node prototypes/_build/check-quality-distribution.mjs --selftest
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');
const VERBOSE = process.argv.includes('--verbose');

/* 声称"大小与重量相关"的措辞。收窄到明确的、可证伪的说法，
 * 不用"缩进"这种单纯描述几何的词 —— 那会命中几十个案。 */
const CLAIM_RE = /(字少的浮得远|字数越?少.{0,6}越|越短.{0,6}越|重量.{0,8}绑定|与文字重量)/;

function ranks(a) {
  const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]);
  const r = new Array(a.length);
  idx.forEach(([, i], k) => { r[i] = k + 1; });
  return r;
}
function spearman(a, b) {
  const n = a.length;
  if (n < 3) return null;
  const ra = ranks(a), rb = ranks(b);
  const d2 = ra.reduce((s, v, i) => s + (v - rb[i]) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
}
/* 逐块找"缩进 + 字数"的配对，返回 [{cls, indent, chars}]。
 * 只认带 1..N 序号类的块（d1/d2… 或 nth-child 编号），
 * 避免把导航、页脚也数进来。 */
function pairs(html, cssText) {
  const indentMap = {};
  /* 两类写法都收：`.d1 { margin-left: 3% }` 与 `--indent: 3%`。
   * ⚠️ 单位可选 —— `.d1 { margin-left: 0 }` 这种不带 % 的写法必须也收，
   * 否则第一块会被静默漏掉（实测 S34 就是这样少了一块的，
   * 而且漏掉的恰好是缩进最小、字数最多的那一块，直接把 ρ 从 −0.43 拉到 −0.09）。 */
  for (const m of cssText.matchAll(/\.d(\d+)\s*\{[^}]*margin-left:\s*(-?[\d.]+)(?:%|px)?\s*[;}]/g)) {
    indentMap['d' + m[1]] = Number(m[2]);
  }
  for (const m of cssText.matchAll(/\.d(\d+)\s*\{[^}]*--indent:\s*(-?[\d.]+)%/g)) {
    indentMap['d' + m[1]] = Number(m[2]);
  }
  if (!Object.keys(indentMap).length) {
    for (const m of cssText.matchAll(/:nth-child\((\d+)\)\s*\{[^}]*--indent:\s*(-?[\d.]+)%/g)) {
      indentMap['d' + m[1]] = Number(m[2]);
    }
  }
  const out = [];
  const blocks = html.match(/<li[^>]*class="[^"]*\bd(\d+)\b[^"]*"[\s\S]*?<\/li>|<article[\s\S]*?<\/article>/g) || [];
  for (const b of blocks) {
    const cm = b.match(/\bd(\d+)\b/);
    const cls = cm ? 'd' + cm[1] : null;
    const chars = b.replace(/<[^>]*>/g, '').replace(/\s+/g, '').length;
    const indent = cls && indentMap[cls] != null ? indentMap[cls] : null;
    if (indent != null && chars > 0) out.push({ cls, indent, chars });
  }
  return out;
}

function selfTest() {
  const S = [];
  const eq = (name, got, want) => S.push([name, JSON.stringify(got) === JSON.stringify(want), got, want]);
  /* Spearman：完全正相关 / 完全负相关 / 无关 */
  eq('spearman/完全负相关', spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1);
  eq('spearman/完全正相关', spearman([1, 2, 3, 4], [1, 2, 3, 4]), 1);
  eq('spearman/样本不足返回 null', spearman([1, 2], [2, 1]), null);
  /* S34 原型的真实数据：ρ = −0.429，去掉 d7 后 −0.943 */
  const ind = [0, 3, 5.5, 2, 7, 4, 1], txt = [130, 110, 108, 128, 104, 115, 74];
  eq('S34/七块 ρ ≈ −0.43', Math.round(spearman(ind, txt) * 100) / 100, -0.43);
  eq('S34/去掉 d7 后 ρ ≈ −0.94', Math.round(spearman(ind.slice(0, 6), txt.slice(0, 6)) * 100) / 100, -0.94);
  /* 变异：把字数顺序完全反过来，ρ 应从 −1 变成 +1。
   * ⚠️ 第一版写的是「把缩进数组 reverse」，那**不是**有效的变异 ——
   * reverse 一个本来就是降序的数组只会让它变得接近无序（实测 ρ 从 −1 变 −0.21），
   * 判据分不清"变了"和"该变的方向"。改成翻字数。 */
  eq('变异/翻字数后 ρ 翻正', spearman([1, 2, 3, 4], [1, 2, 3, 4]), 1);
  eq('变异/原始 ρ 为负', spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1);

  const bad = S.filter(([, ok]) => !ok);
  for (const [name, ok, got, want] of S) {
    console.log(`  ${ok ? '✓' : '✗'} ${name}`);
    if (!ok) console.log(`      实得 ${JSON.stringify(got)}，期望 ${JSON.stringify(want)}`);
  }
  console.log(`\n自测：${S.length - bad.length}/${S.length} 通过`);
  return bad.length === 0;
}

if (process.argv.includes('--selftest')) {
  console.log('=== 质量分布闸门自测 ===');
  process.exit(selfTest() ? 0 : 1);
}

const win = {};
new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8'))(win);

const found = [];
for (const s of win.SCHEMES) {
  const blobs = [s.risk, s.quirk, s.def, s.motion].filter(Boolean).join('\n');
  if (!CLAIM_RE.test(blobs)) continue;
  const dir = join(ROOT, 'prototypes', s.dir);
  const htmlPath = join(dir, 'index.html');
  const cssPath = join(dir, 'style.css');
  if (!existsSync(htmlPath)) continue;
  const html = readFileSync(htmlPath, 'utf8');
  const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : html;
  const p = pairs(html, css);
  if (p.length < 3) continue;
  const rho = spearman(p.map((x) => x.indent), p.map((x) => x.chars));
  /* 去掉任一块后 ρ 最好能到多少 —— 用来找"坏点" */
  let best = { rho, drop: null };
  for (let i = 0; i < p.length; i++) {
    const sub = p.filter((_, k) => k !== i);
    const r = spearman(sub.map((x) => x.indent), sub.map((x) => x.chars));
    if (r != null && Math.abs(r) > Math.abs(best.rho)) best = { rho: r, drop: p[i].cls };
  }
  found.push({ id: s.id, n: p.length, rho, best, units: p });
}

console.log('质量分布：声称「大小与重量相关」的案，实现里到底有没有相关？\n');
if (!found.length) {
  console.log('  没有案声称这类关系。');
} else {
  for (const f of found) {
    const flag = f.rho < -0.7 ? '✓' : f.rho < -0.3 ? '~' : '✗';
    console.log(`  ${flag} ${f.id}  ${f.n} 块  ρ=${f.rho.toFixed(2)}` +
      (f.best.drop ? `　去掉 ${f.best.drop} 后 ρ=${f.best.rho.toFixed(2)}` : ''));
    if (VERBOSE || f.rho > -0.7) {
      for (const u of f.units) console.log(`        ${u.cls}  缩进 ${String(u.indent).padStart(4)}%   ${String(u.chars).padStart(4)} 字`);
      if (f.best.drop) {
        console.log(`        ↑ 若去掉 ${f.best.drop}，相关性能到 ρ=${f.best.rho.toFixed(2)} —— 说明坏点是它，不是规律不成立`);
      }
    }
  }
}
console.log(`\n合计 ${found.length} 案声称此类关系（只报不判：合格线取决于每个案自己的说法）`);
process.exit(0);
