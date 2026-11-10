// Q3 探针：子集关系 —— 「抽共享模块」是不是过度工程
//
// 若 data.js 的 palette 是 prompts.js 的子集，说明一条是另一条的前缀/截断，
// 而不是「两条独立算同一件事」。那么共享模块的经典理由（消除重复逻辑）就不成立。
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const P = join(ROOT, 'prototypes');

const dw = { window: {} };
new Function('window', readFileSync(join(P, '_selection/data.js'), 'utf8'))(dw.window);
const dM = new Map((dw.window.SCHEMES || []).map((s) => [s.id, s]));

const pw = { window: {} };
new Function('window', readFileSync(join(P, '_selection/prompts.js'), 'utf8'))(pw.window);
const pM = new Map((pw.window.STYLE_PROMPTS.schemes || []).map((s) => [s.id, s]));

const hexes = (s) => [...new Set([...String(s).matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => m[0].toUpperCase()))];

let subset = 0, sameSet = 0, strictSubset = 0, dataOnly = 0;
const diffLenHist = {};
const notSubset = [];

for (const id of [...dM.keys()].sort()) {
  const d = (dM.get(id).palette || []).map((h) => String(h).toUpperCase());
  const p = hexes(pM.get(id)?.dna?.palette || '');
  const missing = d.filter((h) => !p.includes(h));
  const extra = p.filter((h) => !d.includes(h));
  diffLenHist[extra.length] = (diffLenHist[extra.length] || 0) + 1;
  if (!missing.length) {
    subset++;
    const ds = new Set(d), ps = new Set(p);
    if (ds.size === ps.size && d.every((h) => ps.has(h))) sameSet++;
    else strictSubset++;
  } else {
    notSubset.push({ id, missing });
    dataOnly += missing.length;
  }
}

console.log('=== data.js palette ⊆ prompts.js palette ? ===\n');
console.log(`子集成立            : ${subset}/${dM.size}`);
console.log(`  其中集合完全相同  : ${sameSet}`);
console.log(`  其中严格子集(少列): ${strictSubset}`);
console.log(`子集不成立          : ${notSubset.length}/${dM.size}（data 有而 prompts 没有的色共 ${dataOnly} 个）`);
if (notSubset.length) for (const x of notSubset) console.log(`  ${x.id} 缺: ${x.missing.join(' ')}`);

console.log('\nprompts.js 比 data.js 多出的色数分布:', JSON.stringify(diffLenHist));

console.log('\n=== 这对「抽共享模块」意味着什么 ===\n');
console.log('两链的抽取逻辑本来就不一样：');
console.log('  collect-schemes.mjs : 按规格声明序，pal.length >= 4 就 break（封顶 4）');
console.log('  clean-dna.pickPalette: 主色优先 + 规格声明色优先 + :root 派生补位（封顶 7）');
console.log('');
console.log('抽一个共享模块，结果只能是模块长出 mode: "ui" | "prompt" 参数 —— 复杂度不减、耦合增加。');
console.log('更便宜的等价方案：不动数据层，只把「关系」写成闸门（Lead 已做）。');
console.log('');
console.log('⚠️ 但注意：ad69f20 给 pickPalette 新增了读 _specs/Sxx.md 的依赖，');
console.log('   于是两链现在共享上游 _specs —— R1（子集）从「跨源对账」退化为「自己对自己」。');

process.exit(notSubset.length ? 1 : 0);
