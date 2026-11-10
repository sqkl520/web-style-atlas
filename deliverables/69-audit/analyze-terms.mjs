// 分析 1：73 个词在 data.js 的 30 案里到底出现在哪 —— 「适合」从句 / 「不适合」从句 / 都没有。
// 只读分析，不驱动浏览器。
import fs from 'node:fs';

const srcD = fs.readFileSync('prototypes/_selection/data.js', 'utf8');
const srcP = fs.readFileSync('prototypes/_selection/prompts.js', 'utf8');
global.window = {};
new Function('window', srcD)(global.window);
const S = global.window.SCHEMES;
global.window = {};
new Function('window', srcP)(global.window);
const P = global.window.STYLE_PROMPTS;

const terms44 = Object.keys(P.sceneIndex);
const terms29 = P.unsupported;
const all = [...terms44, ...terms29];

// scenes 字段形如「适合…。不适合：…」
function splitScenes(s) {
  const t = String(s.scenes || '');
  const i = t.indexOf('不适合');
  return { yes: i >= 0 ? t.slice(0, i) : t, no: i >= 0 ? t.slice(i) : '' };
}

const rows = [];
for (const term of all) {
  const yes = [], no = [];
  for (const s of S) {
    const p = splitScenes(s);
    if (p.yes.includes(term)) yes.push(s.id);
    else if (p.no.includes(term)) no.push(s.id);
  }
  rows.push({ term, in44: terms44.includes(term), in29: terms29.includes(term), yes, no });
}

fs.writeFileSync('D:/Web/style/deliverables/69-audit/term-matrix.json', JSON.stringify(rows, null, 1));

console.log('词\t档\t「适合」里出现\t「不适合」里出现');
for (const r of rows) {
  console.log(`${r.term}\t${r.in44 ? '44' : '29'}\t${r.yes.join(',') || '-'}\t${r.no.join(',') || '-'}`);
}
console.log('\n=== 29 个 unsupported 词中，有案子在「适合」里写了它的 ===');
const bad = rows.filter(r => r.in29 && r.yes.length);
for (const r of bad) console.log(`  ${r.term}: ${r.yes.join(',')}  ← 索引说"没有对应风格"，但 ${r.yes.join(',')} 的适用场景写着它`);
console.log('合计', bad.length, '个');

console.log('\n=== 44 词中，「适合」里完全没出现、只有近似款的 ===');
const nearOnly = rows.filter(r => r.in44 && !r.yes.length);
console.log(nearOnly.length, nearOnly.map(r => r.term).join(' '));
