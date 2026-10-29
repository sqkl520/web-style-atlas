// 修正版：正确解析规格字段 3 的「面积百分比」
// 坑：规格里混着「色相 213°、饱和 15.9%、明度 24.9%」这些 HSL 分量，和真正的面积占比共用 %
// 判据：面积百分比紧跟在角色名/括号之后，写作「，NN%」或「）NN%」；HSL 分量前面必有「色相/饱和/明度/S/L」
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = 'D:/Web/style';
const P = ROOT + '/prototypes';

const dataJs = readFileSync(P + '/_selection/data.js', 'utf8');
const sbD = { window: {} };
new Function('window', dataJs)(sbD.window);
const dM = new Map((sbD.window.SCHEMES || []).map((s) => [s.id, s]));

const HEXT = /#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g;

/** 正确抽面积：在声明段里，取「括号闭合后」或「角色名后」的第一个 %
 *  排除：色相/饱和/明度/S/L 等 HSL 关键词后面的 %
 */
function specAreas(id) {
  const p = join(P, '_specs', id + '.md');
  if (!existsSync(p)) return new Map();
  const md = readFileSync(p, 'utf8');
  const lines = md.split(/\r?\n/);
  const i = lines.findIndex((l) => /配色系统/.test(l));
  if (i < 0) return new Map();
  const buf = [lines[i]];
  for (let j = i + 1; j < lines.length; j++) {
    if (/^\*{0,2}4[\.．]?\s/.test(lines[j].trim())) break;
    buf.push(lines[j]);
  }
  const text = buf.join('\n');
  const out = new Map();
  for (const seg of text.split(/[；。]/)) {
    const m = seg.match(HEXT);
    if (!m) continue;
    if (seg.indexOf(m[0]) > 40) continue;
    const hex = m[0].toUpperCase();

    /* 在 hex 之后找面积%：
     *   「`#XXXXXX` 名字（…HSL…）46%」  → 取最后一个「）NN%」
     *   「`#XXXXXX` 名字 46%」           → 直接
     * 策略：找出所有 % 出现位置，跳过那些前面 12 字符内有 HSL 关键词的
     */
    const after = seg.slice(seg.indexOf(m[0]));
    const HSL_WORD = /(色相|饱和|明度|[SL]\s*$|[SL]\s*[，,])/;
    let best = null;
    const pctRe = /(\d{1,3}(?:\.\d)?)\s*%/g;
    let pm;
    while ((pm = pctRe.exec(after))) {
      const before = after.slice(Math.max(0, pm.index - 14), pm.index);
      if (HSL_WORD.test(before)) continue;          // 是 HSL 分量
      if (/对比度|:[1１]|AA|AAA/.test(before)) continue; // 是对比度
      best = parseFloat(pm[1]);
      break;                                         // 取第一个非 HSL 的
    }
    if (best !== null && best > 0 && best <= 100) {
      if (!out.has(hex)) out.set(hex, best);
    }
  }
  return out;
}

console.log('=== 修正后：规格面积最大的色 vs palette[0] ===\n');
console.log('案    palette[0]  面积   规格最大色   面积   和=100?  一致?');
console.log('-'.repeat(80));
let agree = 0, disagree = 0, sumOk = 0, tested = 0;
const bad = [];
for (const id of [...dM.keys()].sort()) {
  const dPal = (dM.get(id).palette || []).map((h) => String(h).toUpperCase());
  const first = dPal[0] || '';
  const areas = specAreas(id);
  if (!areas.size) continue;
  tested++;
  const total = [...areas.values()].reduce((a, b) => a + b, 0);
  const sumIs100 = Math.abs(total - 100) <= 3;
  if (sumIs100) sumOk++;
  const sorted = [...areas.entries()].sort((a, b) => b[1] - a[1]);
  const [maxHex, maxPct] = sorted[0];
  const firstPct = areas.get(first);
  const ok = first === maxHex;
  if (ok) agree++; else { disagree++; bad.push({ id, first, firstPct, maxHex, maxPct, total }); }
  console.log(
    `${id}  ${first.padEnd(9)} ${String(firstPct ?? '?').padStart(5)}%  ${maxHex.padEnd(9)} ${String(maxPct).padStart(5)}%  ` +
    `${sumIs100 ? '✓' : String(total.toFixed(1)).padStart(5)}   ${ok ? '✓' : '✗'}`
  );
}
console.log('-'.repeat(80));
console.log(`\n可测: ${tested}/30   面积和=100: ${sumOk}/${tested}   一致: ${agree}   矛盾: ${disagree}`);

console.log('\n=== 矛盾的案 ===');
for (const x of bad) {
  console.log(`  ${x.id}  palette[0]=${x.first}（${x.firstPct ?? '?'}%），真最大=${x.maxHex}（${x.maxPct}%）  相差 ${(x.maxPct / (x.firstPct || 1)).toFixed(1)}×`);
}
