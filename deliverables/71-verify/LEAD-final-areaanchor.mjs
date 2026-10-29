// 关键判定：prompt-copy.js:730 让 AI「最大面积用 palette[0]」——
// 而 dna.palette[0] 是主色（16/30）/底色（7/30）/其它（7/30），顺序不稳定。
// 问题：用规格面积裁判，「palette[0] 是最大面积色」成立几案？
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = 'D:/Web/style';
const P = ROOT + '/prototypes';

const pr = readFileSync(P + '/_selection/prompts.js', 'utf8');
const sbP = { window: {} };
new Function('window', pr)(sbP.window);
const pM = new Map((sbP.window.STYLE_PROMPTS.schemes || []).map((s) => [s.id, s]));

const HEXT = /#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g;

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
    const after = seg.slice(seg.indexOf(m[0]));
    const HSL_WORD = /(色相|饱和|明度|[SL]\s*$|[SL]\s*[，,])/;
    let best = null;
    const pctRe = /(\d{1,3}(?:\.\d)?)\s*%/g;
    let pm;
    while ((pm = pctRe.exec(after))) {
      const before = after.slice(Math.max(0, pm.index - 14), pm.index);
      if (HSL_WORD.test(before)) continue;
      if (/对比度|:[1１]|AA|AAA/.test(before)) continue;
      best = parseFloat(pm[1]);
      break;
    }
    if (best !== null && best > 0 && best <= 100 && !out.has(hex)) out.set(hex, best);
  }
  return out;
}

console.log('=== 裁判：dna.palette[0] 是不是规格里的最大面积色？===\n');
console.log('案    palette[0]  面积    真最大色    面积    结局');
console.log('-'.repeat(74));
let ok = 0, bad = 0;
const badList = [];
for (const id of [...pM.keys()].sort()) {
  const rawPal = pM.get(id)?.dna?.palette;
  const entries = Array.isArray(rawPal) ? rawPal : String(rawPal || '').split('、');
  const firstHex = (String(entries[0] || '').match(HEXT) || [])[0]?.toUpperCase() || '';
  const areas = specAreas(id);
  if (!areas.size || !firstHex) { console.log(`${id}  （缺数据）`); continue; }
  const sorted = [...areas.entries()].sort((a, b) => b[1] - a[1]);
  const [maxHex, maxPct] = sorted[0];
  const firstPct = areas.get(firstHex);
  const good = firstHex === maxHex;
  if (good) ok++; else { bad++; badList.push({ id, firstHex, firstPct, maxHex, maxPct }); }
  console.log(
    `${id}  ${firstHex.padEnd(9)} ${String(firstPct ?? '?').padStart(5)}%  ${maxHex.padEnd(9)} ${String(maxPct).padStart(5)}%   ${good ? '✓ 就是最大' : '✗ 不是最大'}`
  );
}
console.log('-'.repeat(74));
console.log(`\npalette[0] 确实是最大面积色: ${ok}/30    不是: ${bad}/30`);

if (badList.length) {
  console.log('\n=== 不是最大的案：AI 会按 730 行把「非最大色」铺满 ===');
  for (const x of badList) {
    const ratio = x.firstPct ? (x.maxPct / x.firstPct).toFixed(1) : '?';
    const sev = x.firstPct === undefined ? '?' : (x.maxPct / x.firstPct) >= 2 ? '严重' : '轻微';
    console.log(`  ${x.id}  铺 ${x.firstHex}（${x.firstPct ?? '?'}%）vs 真实最大 ${x.maxHex}（${x.maxPct}%）  差 ${ratio}×  [${sev}]`);
  }
}

console.log('\n\n=== 另一个可能的解读：730 行说"按明度顺序分配" ===');
console.log('若原意是「最亮的铺最大面积」，那判据应是「palette[0] 是最亮的色」\n');
function lum(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
let brightest = 0;
for (const id of [...pM.keys()].sort()) {
  const rawPal = pM.get(id)?.dna?.palette;
  const entries = Array.isArray(rawPal) ? rawPal : String(rawPal || '').split('、');
  const hexes = entries.map((e) => (String(e).match(HEXT) || [])[0]?.toUpperCase()).filter(Boolean);
  if (hexes.length < 2) continue;
  const lums = hexes.map((h) => ({ h, l: lum(h) }));
  const maxL = lums.reduce((a, b) => (b.l > a.l ? b : a));
  const minL = lums.reduce((a, b) => (b.l < a.l ? b : a));
  if (hexes[0] === maxL.h) brightest++;
}
console.log(`palette[0] 是最亮的色: ${brightest}/30`);
