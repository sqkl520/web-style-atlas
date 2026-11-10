// Lead 核实 4：prompts.js 多出来的色，是规格里的还是 CSS 派生的？
// 如果 prompts 多出来的都不在规格字段3 里 → 是 pickPalette 从 :root 补的派生色
// 那么「data.js 丢色」这个指控就反了：是 prompts.js 加色
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = 'D:/Web/style';
const P = ROOT + '/prototypes';

const dataJs = readFileSync(P + '/_selection/data.js', 'utf8');
const sbD = { window: {} };
new Function('window', dataJs)(sbD.window);
const SCHEMES = sbD.window.SCHEMES || [];
const dM = new Map(SCHEMES.map((s) => [s.id, s]));

const pr = readFileSync(P + '/_selection/prompts.js', 'utf8');
const sbP = { window: {} };
new Function('window', pr)(sbP.window);
const pM = new Map((sbP.window.STYLE_PROMPTS.schemes || []).map((s) => [s.id, s]));

const HEXT = /#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g;
const hx = (s) => [...String(s).matchAll(HEXT)].map((m) => m[0].toUpperCase());

function specField3Hexes(id) {
  const p = join(P, '_specs', id + '.md');
  if (!existsSync(p)) return [];
  const md = readFileSync(p, 'utf8');
  const lines = md.split(/\r?\n/);
  const i = lines.findIndex((l) => /配色系统/.test(l));
  if (i < 0) return [];
  const out = [lines[i]];
  for (let j = i + 1; j < lines.length; j++) {
    if (/^\*{0,2}4[\.．]?\s/.test(lines[j].trim())) break;
    out.push(lines[j]);
  }
  const text = out.join('\n');
  // 只要带百分比的角色声明段（"`#XXXXXX` 名字＝角色，NN%"）
  const decl = [];
  for (const seg of text.split(/[；。]/)) {
    if (!/\d(?:\.\d)?\s*%/.test(seg)) continue;
    const m = seg.match(HEXT);
    if (!m) continue;
    if (seg.indexOf(m[0]) > 40) continue;
    decl.push(m[0].toUpperCase());
  }
  return [...new Set(decl)];
}

console.log('=== prompts.js 多出来的色，是否在规格字段3 的角色声明里？ ===\n');
console.log('案    多出的色                                在规格字段3?');
console.log('-'.repeat(88));
let totalExtra = 0, inSpec = 0, notInSpec = 0;
const notInSpecList = [];
for (const id of [...dM.keys()].sort()) {
  const d = hx((dM.get(id).palette || []).join(' '));
  const r = pM.get(id)?.dna?.palette;
  const p = hx(Array.isArray(r) ? r.join(' ') : String(r || ''));
  const extra = p.filter((h) => !d.includes(h));
  if (!extra.length) continue;
  const spec = specField3Hexes(id);
  const flags = extra.map((h) => ({ h, inSpec: spec.includes(h) }));
  totalExtra += extra.length;
  const nIn = flags.filter((f) => f.inSpec).length;
  inSpec += nIn;
  notInSpec += extra.length - nIn;
  if (extra.length - nIn > 0) notInSpecList.push({ id, list: flags.filter((f) => !f.inSpec).map((f) => f.h) });
  console.log(`${id}  ${extra.join(' ').padEnd(42)} ${nIn}/${extra.length} 在规格`);
}
console.log('-'.repeat(88));
console.log(`\n多出的色总数: ${totalExtra}`);
console.log(`  其中在规格字段3 里有角色声明: ${inSpec}`);
console.log(`  其中不在规格字段3 里（CSS 派生）: ${notInSpec}`);

if (notInSpecList.length) {
  console.log('\n=== 不在规格里的色（这些是 pickPalette 从 :root 补的）===');
  for (const x of notInSpecList) console.log(`  ${x.id}: ${x.list.join(' ')}`);
}

console.log('\n\n=== 换个角度：data.js 的 4 色 vs 规格字段3 的角色声明，几对几？ ===');
console.log('案    data.js 色数  规格字段3 声明色数  完全一致?');
console.log('-'.repeat(70));
let exact = 0, tested = 0;
for (const id of [...dM.keys()].sort()) {
  const d = hx((dM.get(id).palette || []).join(' '));
  const spec = specField3Hexes(id);
  if (!spec.length) continue;
  tested++;
  const same = JSON.stringify([...d].sort()) === JSON.stringify([...spec].sort());
  if (same) exact++;
  console.log(`${id}  ${String(d.length).padStart(10)}  ${String(spec.length).padStart(16)}  ${same ? '✓' : '✗ ' + 'data=' + d.join(',') + ' spec=' + spec.join(',')}`);
}
console.log('-'.repeat(70));
console.log(`data.js 与规格字段3 完全一致: ${exact}/${tested}`);
