// 精确对比两条链的 palette（data.js 是选型台推荐卡用，prompts.js 是提示词用）
import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style';

const dataJs = readFileSync(ROOT + '/prototypes/_selection/data.js', 'utf8');
const promptsSrc = readFileSync(ROOT + '/prototypes/_selection/prompts.js', 'utf8');
const sb = { window: {} };
new Function('window', promptsSrc)(sb.window);
const schemes = sb.window.STYLE_PROMPTS.schemes;

const HEXT = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
const hexes = (s) => [...new Set([...String(s).matchAll(HEXT)].map((m) => m[0].toUpperCase()))];

/* data.js 是 window.SCHEMES = [...]，直接在沙箱里求值最可靠 */
const sb2 = { window: {} };
try {
  new Function('window', dataJs)(sb2.window);
} catch (e) {
  console.log('data.js 求值失败: ' + e.message.slice(0, 120));
}
const SCHEMES = sb2.window.SCHEMES || sb2.window.STYLE_PROMPTS?.schemes || [];
console.log(`data.js 里 SCHEMES 数量: ${Array.isArray(SCHEMES) ? SCHEMES.length : '非数组'}`);

const dataPal = new Map();
if (Array.isArray(SCHEMES)) {
  for (const s of SCHEMES) dataPal.set(s.id, (s.palette || []).map((h) => String(h).toUpperCase()));
}

console.log(`\n=== 两链 palette 对比 ===\n`);
console.log('案     data.js（选型台色块）              prompts.js（提示词）');
console.log('-'.repeat(100));
let diff = 0;
const rows = [];
for (const s of schemes) {
  const d = dataPal.get(s.id) || [];
  const raw = s.dna?.palette;
  const p = hexes(Array.isArray(raw) ? raw.join(' ') : String(raw || ''));
  const same = JSON.stringify([...d].sort()) === JSON.stringify([...p].sort());
  if (!same) diff++;
  rows.push({ id: s.id, d, p, same });
  console.log(`${s.id}  ${String(d.length).padStart(2)}色 [${d.join(',').padEnd(36)}] ${String(p.length).padStart(2)}色`);
}

console.log('-'.repeat(100));
console.log(`\n不一致的案: ${diff}/30`);
const dLens = rows.map((r) => r.d.length);
const pLens = rows.map((r) => r.p.length);
console.log(`data.js palette 长度分布: ${JSON.stringify(dLens.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), {}))}`);
console.log(`prompts palette 长度分布: ${JSON.stringify(pLens.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), {}))}`);

console.log('\n=== data.js 有但 prompts.js 没有的色（选型台画了但提示词没说）===');
let missing = 0;
for (const r of rows) {
  const miss = r.d.filter((h) => !r.p.includes(h));
  if (miss.length) { missing += miss.length; console.log(`  ${r.id}: ${miss.join(' ')}`); }
}
console.log(`合计 ${missing} 个`);

console.log('\n=== prompts.js 有但 data.js 没有的色（提示词说了但选型台没画）===');
let extra = 0;
for (const r of rows) {
  const ex = r.p.filter((h) => !r.d.includes(h));
  if (ex.length) { extra += ex.length; }
}
console.log(`合计 ${extra} 个`);

console.log('\n=== 关键：选型台推荐卡只画 palette.slice(0,4)，够不够代表？===');
const over4 = rows.filter((r) => r.d.length > 4).length;
console.log(`data.js palette >4 色的案: ${over4}/30（若为 0，说明恰好卡在 4）`);
