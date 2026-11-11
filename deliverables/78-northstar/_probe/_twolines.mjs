/* 核查「data.js 与 prompts.js 是两条刻意分开的数据链」这条核心约束是否还成立。
 * 分开的理由：data.js = 设计意图（4 色、cn/en/structure），
 *            prompts.js = 施工细节（4–9 色、dna/capacity）。
 * 如果某一方悄悄包含了另一方的字段，说明两条链被合并了。 */
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const load = (rel, key) => {
  const c = { window: {} };
  vm.createContext(c);
  vm.runInContext(readFileSync(join(ROOT, rel), 'utf8'), c);
  const v = c.window[key];
  if (v === undefined) throw new Error(`${rel} 没有 window.${key}`);
  return v;
};

const W = load('prototypes/_selection/data.js', 'SCHEMES');
const P = load('prototypes/_selection/prompts.js', 'STYLE_PROMPTS').schemes;

console.log('data.js 案数:', W.length, ' prompts.js 案数:', P.length);
const wIds = W.map((s) => s.id).join(',');
const pIds = P.map((s) => s.id).join(',');
console.log('案号集合相同:', wIds === pIds);

const wKeys = new Set(W.flatMap((s) => Object.keys(s)));
const pKeys = new Set(P.flatMap((s) => Object.keys(s)));
const shared = [...wKeys].filter((k) => pKeys.has(k));
console.log('\ndata.js 字段:', [...wKeys].join(','));
console.log('prompts.js 字段:', [...pKeys].join(','));
console.log('共有字段:', shared.join(',') || '（无）');

/* 逐案查：两边的 minPics / hard 是否一致（这两字段两边都有，最容易静默分叉） */
let mism = 0;
for (const w of W) {
  const p = P.find((x) => x.id === w.id);
  if (!p) continue;
  for (const k of ['minPics', 'hard']) {
    if (k in w && k in p && JSON.stringify(w[k]) !== JSON.stringify(p[k])) {
      console.log(`  分叉 ${w.id}.${k}: data=${JSON.stringify(w[k])} prompts=${JSON.stringify(p[k])}`);
      mism++;
    }
  }
}
console.log(`\nminPics/hard 分叉数: ${mism}`);

/* 色数：data.js 是否真的只有 4 色（设计意图），prompts.js 是 4-9 色 */
const countHex = (s) => new Set((JSON.stringify(s).match(/#[0-9A-Fa-f]{6}/g) || []).map((h) => h.toUpperCase())).size;
const wc = W.map((s) => countHex(s));
const pc = P.map((s) => countHex(s));
const stat = (a) => `min ${Math.min(...a)} / max ${Math.max(...a)} / 中位 ${a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)]}`;
console.log('data.js 色数:', stat(wc), ' ← 判据：应恒为 4 左右');
console.log('prompts.js 色数:', stat(pc), ' ← 判据：应为 4–9');
console.log('色数不一致的案:', W.filter((w, i) => wc[i] === pc[i]).map((w) => w.id).join(' ') || '（全部不一致，符合设计）');
