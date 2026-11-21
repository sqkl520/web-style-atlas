/* 实测：audit 全量进提示词后，**真实** buildStylePrompt 长度涨多少。
 *
 * 【为什么不能像 _audit-length-impact.mjs 那样外推】
 * 旧脚本用「5 段样本的 压缩率 × 35 案总字数 / 35」估中位增量。两个错：
 *   ① 每案提示词基线差 580 字（2747–3323），增量按"平均值"加到"中位数"上不对；
 *   ② audit 不是均匀分布的 —— 它是否进提示词、进多少，取决于 prompt-copy.js 的
 *      拼装逻辑（有没有截断、有没有条件分支）。外推假设它无脑整段拼接。
 * 所以这里**真的跑 buildStylePrompt**：同一份 prompt-copy.js，同一份 prompts.js，
 * 只在 window.SCHEMES 上把 audit 换成改写稿，然后逐案量。
 *
 * 三种口径都量出来，因为"涨幅"这个问题有不同的答案：
 *   A 现状基线
 *   B audit 整段（改写后）追加进提示词 —— 上限，最坏情况
 *   C audit 整段（改写后）追加，但**只在提示词里本来没有该信息时**
 *     —— 这是实际会采用的口径吗？不，这里不做这个假设，只量 A 与 B。
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../../');
const SEL = join(ROOT, 'prototypes/_selection');
const rewrites = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/_audit-rewrites/rewrites.json'), 'utf8'));

function buildAll(override) {
  const win = {};
  const doc = {
    readyState: 'complete',
    addEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {} }),
  };
  const sandbox = { window: win, document: doc, console };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(SEL, 'data.js'), 'utf8'), sandbox, { filename: 'data.js' });
  vm.runInContext(readFileSync(join(SEL, 'prompts.js'), 'utf8'), sandbox, { filename: 'prompts.js' });
  if (override) override(win);
  vm.runInContext(readFileSync(join(SEL, 'prompt-copy.js'), 'utf8'), sandbox, { filename: 'prompt-copy.js' });
  const build = win.buildStylePrompt;
  if (typeof build !== 'function') throw new Error('buildStylePrompt 不可用');
  const out = [];
  for (const s of win.SCHEMES) {
    let n = 0;
    try { n = build(s.id).length; } catch (e) { n = -1; }
    out.push({ id: s.id, n, audit: (s.audit || '').length });
  }
  return out;
}

const median = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const pct = (x, y) => ((x / y - 1) * 100);

const A = buildAll(null);
const B = buildAll((win) => {
  for (const s of win.SCHEMES) if (rewrites[s.id]) s.audit = rewrites[s.id].after;
});

console.log('案   现状   改写后audit整段追回   增量   涨幅');
const dA = [], dB = [], dD = [];
for (let i = 0; i < A.length; i++) {
  const a = A[i], b = B[i];
  dA.push(a.n); dB.push(b.n); dD.push(b.n - a.n);
  console.log(`${a.id}  ${String(a.n).padStart(5)}  ${String(b.n).padStart(5)}  ${String(b.n - a.n).padStart(+6)}  ${pct(b.n, a.n).toFixed(1).padStart(6)}%`);
}
console.log('');
console.log(`现状      min ${Math.min(...dA)}  median ${median(dA)}  max ${Math.max(...dA)}`);
console.log(`改写后    min ${Math.min(...dB)}  median ${median(dB)}  max ${Math.max(...dB)}`);
console.log(`中位涨幅  ${median(dA)} → ${median(dB)}  = +${median(dB) - median(dA)} 字 = +${pct(median(dB), median(dA)).toFixed(2)}%`);
console.log(`均值涨幅  ${(dA.reduce((a, b) => a + b, 0) / 35).toFixed(0)} → ${(dB.reduce((a, b) => a + b, 0) / 35).toFixed(0)} = +${pct(dB.reduce((a, b) => a + b, 0), dA.reduce((a, b) => a + b, 0)).toFixed(2)}%`);
console.log(`增量      min ${Math.min(...dD)}  中位 ${median(dD)}  max ${Math.max(...dD)} 字`);
console.log(`\ncheck-docs.mjs 容差 3% → ${pct(median(dB), median(dA)) > 3 ? '❌ 超容差，README 中英两版的中位与区间都必须同步改' : '✅ 在容差内'}`);
