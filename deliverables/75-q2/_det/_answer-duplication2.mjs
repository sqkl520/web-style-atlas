import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(readFileSync('prototypes/_selection/prompts.js', 'utf8'), ctx);
const P = ctx.window.STYLE_PROMPTS;
const src = readFileSync('prototypes/_prompts/build-prompts.mjs', 'utf8');
const humanBlock = src.slice(src.indexOf('const HUMAN'), src.indexOf('};', src.indexOf('const HUMAN')));
const humanScenes = {};
for (const m of humanBlock.matchAll(/(S\d{2}):\s*\{[^}]*?scenes:\s*\[([^\]]*)\]/g))
  humanScenes[m[1]] = [...m[2].matchAll(/"([^"]+)"/g)].map(x => x[1]);

const allTerms = new Set(Object.keys(P.sceneIndex));
const unsupported = new Set(P.unsupported);

// 1) 方案自称的行业里，有多少根本不在芯片词表里
let total = 0, absent = 0; const absentList = [];
for (const [id, terms] of Object.entries(humanScenes)) {
  for (const t of terms) {
    total++;
    if (!allTerms.has(t)) { absent++; absentList.push(id + ':' + t + (unsupported.has(t) ? '(在unsupported)' : '(词表里根本没有)')); }
  }
}
console.log('=== 方案自称的行业词 vs 芯片词表 ===');
console.log('30 案共自称', total, '个行业词；其中', absent, '个不在 sceneIndex 的 44 个词里');
console.log('分两类：');
const inUnsup = absentList.filter(x => x.includes('在unsupported'));
const notAnywhere = absentList.filter(x => x.includes('词表里根本没有'));
console.log('\n  A. 在 unsupported 名单里（站点明确说「这套图集撑不起来」）:', inUnsup.length, '个');
console.log('    ', inUnsup.join('  '));
console.log('\n  B. 词表里根本没有（用户点不到、搜不到）:', notAnywhere.length, '个');
console.log('    ', notAnywhere.join('  '));

// 2) 反查：每个 direct 词，命中的案是否在自己的 scenes 里承认这个词
console.log('\n=== 反向矛盾：芯片说「Sxx 就是做这行的」，但该案自己的 scenes 里没有这个词 ===');
let contra = 0;
for (const [term, v] of Object.entries(P.sceneIndex)) {
  for (const id of v.direct || []) {
    const own = humanScenes[id] || [];
    if (!own.includes(term)) { contra++; console.log('  ' + term + ' → ' + id + '，但 ' + id + ' 自称: ' + own.join('/')); }
  }
}
console.log('\n反向矛盾数:', contra);

// 3) 严格同词对齐后还剩多少不一致
console.log('\n=== 严格同词对齐（只比两边都出现过的词）===');
let both = 0, sameSet = 0;
for (const [id, own] of Object.entries(humanScenes)) {
  const fromIdx = Object.entries(P.sceneIndex).filter(([, v]) => (v.direct || []).includes(id)).map(([t]) => t);
  const inter = own.filter(t => fromIdx.includes(t));
  if (fromIdx.length || inter.length) both++;
  if (inter.length === fromIdx.length && inter.length === own.length) sameSet++;
}
console.log('有交集的案:', both, '/ 30；完全一致:', sameSet, '/ 30');
