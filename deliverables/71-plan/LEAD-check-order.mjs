// Lead 核实 3：collect-schemes 的 fromSpec 顺序由什么决定？
// 这决定了「截断规则」能不能变成可复算的，还是只能靠一次性的像素数据
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = 'D:/Web/style';
const P = ROOT + '/prototypes';

console.log('=== 1. collect-schemes.mjs 里 fromSpec 的构造 ===\n');
const src = readFileSync(P + '/_build/collect-schemes.mjs', 'utf8');
const lines = src.split(/\r?\n/);
// 找 p3 的定义
let p3Line = -1;
lines.forEach((l, i) => { if (/\bp3\b\s*=/.test(l)) p3Line = i; });
if (p3Line >= 0) {
  for (let i = Math.max(0, p3Line - 6); i < Math.min(p3Line + 14, lines.length); i++) {
    console.log(`${String(i + 1).padStart(4)}: ${lines[i]}`);
  }
}

console.log('\n=== 2. 规格文本里色的出现顺序 vs data.js 里的顺序 ===\n');
const dataJs = readFileSync(P + '/_selection/data.js', 'utf8');
const sbD = { window: {} };
new Function('window', dataJs)(sbD.window);
const SCHEMES = sbD.window.SCHEMES || [];
const dM = new Map(SCHEMES.map((s) => [s.id, s]));

const HEXT = /#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g;
const hx = (s) => [...String(s).matchAll(HEXT)].map((m) => m[0].toUpperCase());

// 取规格字段3 的 hex 顺序
function specField3Order(id) {
  const p = join(P, '_specs', id + '.md');
  if (!existsSync(p)) return null;
  const md = readFileSync(p, 'utf8');
  const lines = md.split(/\r?\n/);
  const i = lines.findIndex((l) => /配色系统/.test(l));
  if (i < 0) return null;
  const out = [lines[i]];
  for (let j = i + 1; j < lines.length; j++) {
    if (/^\*{0,2}4[\.．]?\s/.test(lines[j].trim())) break;
    out.push(lines[j]);
  }
  return hx(out.join('\n'));
}

console.log('案    规格字段3 里的顺序（前6）                data.js 的顺序');
console.log('-'.repeat(100));
let matchFirst = 0, matchOrder = 0, tested = 0;
for (const id of [...dM.keys()].sort()) {
  const spec = specField3Order(id);
  if (!spec) continue;
  const d = hx((dM.get(id).palette || []).join(' '));
  tested++;
  // data.js 的 palette[0] 是 bg，[1] 是 primary，其余来自 fromSpec
  const fromSpec = d.slice(2);
  // 检查 fromSpec 是否按规格顺序
  const specFiltered = spec.filter((h) => fromSpec.includes(h));
  const inOrder = fromSpec.every((h, i) => {
    const idx = spec.indexOf(h);
    const prevIdx = i > 0 ? spec.indexOf(fromSpec[i - 1]) : -1;
    return idx > prevIdx;
  });
  if (inOrder) matchOrder++;
  if (spec.slice(0, 1)[0] === d[0]) matchFirst++;
  console.log(`${id}  [${spec.slice(0, 6).join(' ').padEnd(42)}] [${d.join(' ')}] ${inOrder ? '✓顺序' : '✗乱序'}`);
}
console.log('-'.repeat(100));
console.log(`fromSpec 部分按规格出现顺序: ${matchOrder}/${tested}`);

console.log('\n=== 3. 关键：规格字段3 的顺序本身有语义吗？ ===\n');
const S03 = readFileSync(P + '/_specs/S03.md', 'utf8');
const i3 = S03.indexOf('配色系统');
console.log('S03 字段3 原文：');
console.log(S03.slice(i3, i3 + 700));

console.log('\n\n=== 4. data.js 里 S03 到底保留了哪 4 个 ===\n');
const s03 = dM.get('S03');
console.log('palette:', JSON.stringify(s03.palette));
console.log('bg:', s03.bg, ' primary:', s03.primary);
console.log('规格字段3 的 hex 顺序:', specField3Order('S03'));
