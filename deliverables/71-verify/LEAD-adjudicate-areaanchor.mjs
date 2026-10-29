// 核实红队 new②：prompt-copy.js:730 让 AI「最大面积用 palette[0]」，
// 但 palette[0] 到底是哪个色？用规格字段 3 的面积百分比裁判
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = 'D:/Web/style';
const P = ROOT + '/prototypes';

const dataJs = readFileSync(P + '/_selection/data.js', 'utf8');
const sbD = { window: {} };
new Function('window', dataJs)(sbD.window);
const dM = new Map((sbD.window.SCHEMES || []).map((s) => [s.id, s]));

const pr = readFileSync(P + '/_selection/prompts.js', 'utf8');
const sbP = { window: {} };
new Function('window', pr)(sbP.window);
const pM = new Map((sbP.window.STYLE_PROMPTS.schemes || []).map((s) => [s.id, s]));

const HEXT = /#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g;
const hx = (s) => [...String(s).matchAll(HEXT)].map((m) => m[0].toUpperCase());

/** 抽规格字段 3 的「hex → 面积%」映射 */
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
    const pm = seg.match(/(\d{1,2}(?:\.\d)?)\s*%/);
    if (!pm) continue;
    const m = seg.match(HEXT);
    if (!m) continue;
    if (seg.indexOf(m[0]) > 40) continue;
    const hex = m[0].toUpperCase();
    const pct = parseFloat(pm[1]);
    // 只保留第一处声明（避免后面的对比度百分比覆盖面积百分比）
    if (!out.has(hex)) out.set(hex, pct);
  }
  return out;
}

console.log('=== 裁判：规格面积最大的色 vs prompt-copy 让 AI 铺满的色 ===\n');
console.log('案    prompt-copy 说的「第一个值」   规格里面积最大的色     一致?');
console.log('-'.repeat(84));

let agree = 0, disagree = 0;
const bad = [];
for (const id of [...dM.keys()].sort()) {
  const dPal = hx((dM.get(id).palette || []).join(' '));
  const first = dPal[0] || '';
  const areas = specAreas(id);
  if (!areas.size) { console.log(`${id}  （规格无面积数据）`); continue; }
  const sorted = [...areas.entries()].sort((a, b) => b[1] - a[1]);
  const maxHex = sorted[0][0];
  const maxPct = sorted[0][1];
  const firstPct = areas.get(first);
  const ok = first === maxHex;
  if (ok) agree++; else { disagree++; bad.push({ id, first, firstPct, maxHex, maxPct }); }
  console.log(
    `${id}  ${first.padEnd(10)} ${firstPct !== undefined ? String(firstPct).padStart(5) + '%' : '   ?? '}  ` +
    `${maxHex.padEnd(10)} ${String(maxPct).padStart(5)}%   ${ok ? '✓' : '✗'}`
  );
}
console.log('-'.repeat(84));
console.log(`\n一致: ${agree}    矛盾: ${disagree}`);

console.log('\n=== 矛盾的案：AI 被要求把「非最大面积色」铺满全页 ===');
for (const x of bad) {
  const ratio = x.firstPct !== undefined && x.maxPct ? (x.firstPct / x.maxPct) : null;
  console.log(
    `  ${x.id}  让 AI 铺 ${x.first}（规格 ${x.firstPct ?? '?'}%），` +
    `而真正最大的是 ${x.maxHex}（${x.maxPct}%）` +
    (ratio !== null ? `  → 相差 ${(x.maxPct / x.firstPct).toFixed(1)} 倍` : '')
  );
}

console.log('\n\n=== 交叉：data.js 的 palette[0] 到底是什么角色？ ===');
console.log('（app.js:953 说 palette[0]=底色；clean-dna 说=主色；prompt-copy:730 说=最大面积色）\n');
let p0IsBg = 0, p0IsMaxArea = 0;
for (const id of [...dM.keys()]) {
  const sc = dM.get(id);
  const pal = hx((sc.palette || []).join(' '));
  const areas = specAreas(id);
  if (pal[0] === String(sc.bg || '').toUpperCase()) p0IsBg++;
  const sorted = [...areas.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length && pal[0] === sorted[0][0]) p0IsMaxArea++;
}
console.log(`palette[0] === bg（app.js 的说法）:        ${p0IsBg}/30`);
console.log(`palette[0] === 规格里的最大面积色（prompt-copy 的说法）: ${p0IsMaxArea}/30`);
