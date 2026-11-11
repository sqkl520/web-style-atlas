/* 提示词可区分度：如果两案提示词高度相似，盲测就无法证明「提示词承载了风格」。
 * 这是一个纯离线的、生成侧的可行性前置检查。 */
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const c = { window: {} };
vm.createContext(c);
vm.runInContext(readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8'), c);
const P = c.window.STYLE_PROMPTS.schemes;

/* 把 dna 拍平成一组「可比较的特征」，逐案归一化后算 Jaccard 相似度。
 * 刻意不用「字符级相似度」——那会被共同模板淹没。 */
const feats = (s) => {
  const d = s.dna || {};
  const f = new Set();
  const add = (tag, v) => { if (v) f.add(tag + ':' + String(v).trim()); };
  add('palette', (d.palette || '').replace(/\s/g, ''));
  add('display', d.fonts && d.fonts.display);
  add('body', d.fonts && d.fonts.body);
  add('mono', d.fonts && d.fonts.mono);
  add('radius', d.radius);
  add('shadow', d.shadow);
  add('lineW', d.lineWidths);
  add('h1', d.h1Size);
  add('body_size', d.bodySize);
  return f;
};

const jac = (a, b) => {
  const inter = [...a].filter((x) => b.has(x)).length;
  const uni = new Set([...a, ...b]).size;
  return uni ? inter / uni : 0;
};

const sets = P.map((s) => ({ id: s.id, f: feats(s) }));
const pairs = [];
for (let i = 0; i < sets.length; i++) {
  for (let j = i + 1; j < sets.length; j++) {
    pairs.push({ a: sets[i].id, b: sets[j].id, s: jac(sets[i].f, sets[j].f) });
  }
}
pairs.sort((x, y) => y.s - x.s);

console.log(`案数 ${sets.length}，两两组合 ${pairs.length}`);
const ss = pairs.map((p) => p.s).sort((a, b) => a - b);
const pct = (q) => ss[Math.floor(ss.length * q)];
console.log(`相似度 中位 ${ss[Math.floor(ss.length / 2)].toFixed(3)}  P90 ${pct(0.9).toFixed(3)}  max ${ss.at(-1).toFixed(3)}`);
console.log('\n最相似的 8 对（若 >0.7 说明提示词不足以区分）：');
for (const p of pairs.slice(0, 8)) console.log(`  ${p.a}~${p.b}  ${p.s.toFixed(3)}`);

/* 再看「机制句」的区分度 —— 这是风格真正的签名 */
const mech = new Set(P.map((s) => (s.dna.mechanism || '').trim()).filter(Boolean));
console.log(`\n机制句去重：${mech.size} / ${P.length}  ${mech.size === P.length ? '（全部不同）' : '⚠ 有重复'}`);

/* 特征维度计数：如果某案所有特征都和别人一样，它就没有签名 */
console.log('\n每案特征数（越少说明提示词信息越薄）：');
const thin = sets.map((s) => ({ id: s.id, n: s.f.size })).sort((a, b) => a.n - b.n);
console.log('  最少 5 案:', thin.slice(0, 5).map((x) => `${x.id}(${x.n})`).join(' '));
