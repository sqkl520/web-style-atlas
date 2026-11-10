/* P3：规格字段 3 的「面积和 100」是硬断言，而且完全可机械核。
 *
 * 核对两件事：
 *   ① 规格自己是否真的加得出 100（可能规格本身就写错了）
 *   ② 原型 CSS 注释里声明的面积比，是否与规格一致
 *
 * 这类断言最容易出错的地方是**解析**：规格里「色相 41.1°、饱和 22.1%、
 * 明度 85.1%」也带百分号，必须只取紧跟在「占/＝/=」后面的那个。
 * 上一轮就因为把 HSL 的饱和当成面积，得出「13/30 矛盾」的错结论。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const ids = readdirSync(join(P, '_specs')).filter((f) => /^S\d{2}\.md$/.test(f)).sort().map((f) => f.slice(0, 3));

/* 字段 3 全文 */
function field3(id) {
  const t = readFileSync(join(P, '_specs', id + '.md'), 'utf8');
  const i = t.indexOf('配色系统');
  if (i < 0) return null;
  const lines = t.slice(i).split(/\r?\n/);
  const buf = [lines[0]];
  for (let k = 1; k < lines.length; k++) {
    if (/^\*{0,2}4[\.．]?\s/.test(lines[k].trim())) break;
    buf.push(lines[k]);
  }
  return buf.join('\n');
}

/* 面积：只认「占/＝/= + 数字%」或「数字% + 紧跟 hex 的角色句」。
 * 明确排除「色相/饱和/明度」前缀的百分号。
 *
 * ⚠️ 2026-10-31 修 bug（两处）：
 *   ① 同一 hex 重复计数。S02 的「#B8860B 18%」与后文「#B8860B 38%」
 *      是同一色的两次提法，v1 把两个都算进面积和 → 138%。
 *      修法：同一 hex 只取第一次带面积的声明。
 *   ② 否定语境的 hex 被算成声明色。S13/S15/S16/S19 的「#6366F1」是
 *      "这套配色反的是 #6366F1 靛蓝"——它是负向示例，不是本案的色。
 *      它后面跟着的百分比（如 15.9%）其实是下一句的温度/明度值。
 *      修法：分句含否定词则整句丢弃。 */
const NEG_CTX = /反的是|反\s*#|不采用|不用|禁止|避免|不是|而不是|旧值|作废|修正前/;

/* 「饱和/色相/明度 + 数字%」是色彩分量，不是面积。
 *
 * ⚠️ 2026-10-31 第三个 bug：S26 的 `#3B82F6` 后跟 21.7%，
 *    原文是「饱和压到 21.7% 的凸版蓝墨，与 #3B82F6 那类高饱和 UI 蓝分开」。
 *    21.7% 是**饱和度**，且 #3B82F6 是负向示例（"与它分开"）。
 *    前两版修复（去重、否定词）都抓不到这一处 —— 因为否定词不在该分句里。
 *    修法：把「饱和/色相/明度 …%」这类分量从候选里剔除，只留真正像面积的。 */
function areaPctOf(cleaned) {
  // 先删掉所有「饱和…%」「明度…%」「色相…°」片段
  const noHsl = cleaned
    .replace(/饱和[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*%/g, '')
    .replace(/明度[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*%/g, '')
    .replace(/色相[^，。；、）)]{0,8}?\d+(?:\.\d+)?\s*°/g, '');
  let m = noHsl.match(/(?:占|=|＝)\s*(\d+(?:\.\d+)?)\s*%/);
  if (m) return parseFloat(m[1]);
  const all = [...noHsl.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];
  if (all.length === 1) return parseFloat(all[1 - 1][1]);
  return null;
}

function areas(seg) {
  const out = [];
  const seen = new Set();
  for (const clause of seg.split(/[；;。\n]/)) {
    if (NEG_CTX.test(clause)) continue;
    const hex = (clause.match(/#[0-9A-Fa-f]{6}/) || [])[0];
    if (!hex) continue;
    const H = hex.toUpperCase();
    if (seen.has(H)) continue;
    // 从分句里剥掉「色相..度、饱和..%、明度..%」这类括号里的 HSL 描述
    const cleaned = clause.replace(/[（(][^）)]*[）)]/g, '');
    const pct = areaPctOf(cleaned);
    if (pct !== null) { out.push({ hex: H, pct }); seen.add(H); }
  }
  return out;
}

console.log('案    声明色数  面积和   判定');
console.log('─'.repeat(56));
const bad = [];
let ok = 0;
const all = [];
for (const id of ids) {
  const seg = field3(id);
  if (!seg) { console.log(`${id}  ✗ 找不到字段 3`); continue; }
  const a = areas(seg);
  const sum = a.reduce((x, y) => x + y.pct, 0);
  const isOk = Math.abs(sum - 100) < 0.51 && a.length >= 2;
  if (isOk) ok++;
  else bad.push({ id, a, sum });
  all.push({ id, a, sum });
  console.log(`${id}  ${String(a.length).padStart(7)}  ${sum.toFixed(1).padStart(6)}   ${isOk ? '✓' : '✗ 偏离 ' + (sum - 100).toFixed(1)}`);
}

console.log(`\n═══ 汇总 ═══`);
console.log(`  面积和 = 100（±0.5）: ${ok}/${ids.length}`);

if (bad.length) {
  console.log('\n═══ 偏离的案 ═══');
  for (const b of bad) {
    console.log(`  ${b.id}  合计 ${b.sum.toFixed(1)}%  （${b.a.length} 个色）`);
    for (const x of b.a) console.log(`      ${x.hex}  ${x.pct}%`);
  }
}

/* ② 与 CSS 头注释里声明的面积比对照 */
console.log('\n═══ ② CSS 注释里声明的面积 vs 规格 ═══');
let matchCss = 0, mismatch = 0, noCss = 0;
for (const { id, a } of all) {
  const dir = readdirSync(P, { withFileTypes: true }).find((d) => d.isDirectory() && d.name.startsWith(id + '-'))?.name;
  if (!dir) continue;
  const cssPath = join(P, dir, 'style.css');
  if (!existsSync(cssPath)) continue;
  const head = readFileSync(cssPath, 'utf8').slice(0, 1600);
  const declared = new Map();
  for (const m of head.matchAll(/(#[0-9A-Fa-f]{6})\s*([\d.]+)\s*%/g)) declared.set(m[1].toUpperCase(), parseFloat(m[2]));
  if (!declared.size) { noCss++; continue; }
  let same = true;
  for (const x of a) {
    if (declared.has(x.hex) && Math.abs(declared.get(x.hex) - x.pct) > 0.51) same = false;
  }
  if (same) matchCss++; else { mismatch++; console.log(`  ${id}  规格 [${a.map((x) => x.hex + '=' + x.pct).join(' ')}]  CSS [${[...declared].map(([h, p]) => h + '=' + p).join(' ')}]`); }
}
console.log(`\n  CSS 注释与规格一致: ${matchCss}   不一致: ${mismatch}   CSS 无面积注释: ${noCss}`);
