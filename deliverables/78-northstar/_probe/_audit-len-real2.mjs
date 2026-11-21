/* 实测涨幅 —— 两个口径，分开报，因为它们回答的是两个不同的问题。
 *
 * 【口径一：提示词】
 * `audit` **现在不进提示词**（实测：把 35 案 audit 全换成改写稿，buildStylePrompt
 * 逐案长度一位不变 = 0.00%）。所以"改写后提示词涨多少"这个问题**当下无解，
 * 因为它还没接上**。能回答的是"接上之后会涨多少"，做法是把改写稿真的拼在
 * prompt-copy.js 产出的那段字符串后面，再量。这里额外把 UI 折叠块的固定开销
 * （summary 7 字 + 换行）也算进去 —— 若将来接的是 auditFold 那段文本而不是裸 audit，
 * 长度会差这一点。
 *
 * 【口径二：audit 字段自身】
 * README:74 与 check-docs.mjs:951-958 断言了 audit 的 最短/中位/合计 三个统计量。
 * 改写会让这三个数全变 —— 这是**必须报告的连带影响**，否则 check-docs 会红。
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../../');
const SEL = join(ROOT, 'prototypes/_selection');
const rewrites = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/_audit-rewrites/rewrites.json'), 'utf8'));

function makeWin() {
  const win = {};
  const doc = { readyState: 'complete', addEventListener() {}, querySelector: () => null,
    querySelectorAll: () => [], getElementById: () => null,
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {} }) };
  const sandbox = { window: win, document: doc, console };
  vm.createContext(sandbox);
  for (const f of ['data.js', 'prompts.js']) vm.runInContext(readFileSync(join(SEL, f), 'utf8'), sandbox, { filename: f });
  return { win, sandbox };
}

/* ── 口径一 ─────────────────────────────────────────────────────────── */
function promptLens(appendAudit) {
  const { win, sandbox } = makeWin();
  vm.runInContext(readFileSync(join(SEL, 'prompt-copy.js'), 'utf8'), sandbox, { filename: 'prompt-copy.js' });
  const build = win.buildStylePrompt;
  const out = [];
  for (const s of win.SCHEMES) {
    const base = build(s.id);
    /* 将来接入时 audit 可能的挂法：整段追加，前面一条空行。
     * 这里量的是**裸 audit**，不含 UI 折叠块的 summary —— 那是 app.js 的 DOM，
     * 不进提示词。提示词里接 audit 的正确形态就是正文本身。 */
    const add = appendAudit ? (rewrites[s.id] ? rewrites[s.id].after : s.audit) : '';
    out.push({ id: s.id, n: base.length + (add ? 1 + add.length : 0), audit: (s.audit || '').length,
      after: rewrites[s.id] ? rewrites[s.id].after.length : 0 });
  }
  return out;
}

const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const pct = (x, y) => ((x / y - 1) * 100);

const A = promptLens(false);
const B = promptLens(true);

console.log('=== 口径一：提示词长度（audit 若整段追加）===');
console.log('案   现状(audit不进)  接入后  增量');
for (let i = 0; i < A.length; i++) {
  console.log(`${A[i].id}  ${String(A[i].n).padStart(6)}  ${String(B[i].n).padStart(6)}  +${String(B[i].n - A[i].n).padStart(3)}`);
}
const aA = A.map((x) => x.n), aB = B.map((x) => x.n);
console.log(`\n现状    min ${Math.min(...aA)}  median ${med(aA)}  max ${Math.max(...aA)}`);
console.log(`接入后  min ${Math.min(...aB)}  median ${med(aB)}  max ${Math.max(...aB)}`);
console.log(`中位    ${med(aA)} → ${med(aB)}   +${med(aB) - med(aA)} 字   +${pct(med(aB), med(aA)).toFixed(2)}%`);
const sum = (a) => a.reduce((x, y) => x + y, 0);
console.log(`均值    ${(sum(aA) / 35).toFixed(0)} → ${(sum(aB) / 35).toFixed(0)}   +${pct(sum(aB), sum(aA)).toFixed(2)}%`);
console.log(`区间    ${Math.min(...aA)}–${Math.max(...aA)} → ${Math.min(...aB)}–${Math.max(...aB)}`);
console.log(`3% 容差 ${pct(med(aB), med(aA)) > 3 ? '❌ 超' : '✅ 未超'}（差 ${(pct(med(aB), med(aA)) - 3).toFixed(2)} 个百分点）`);

/* ── 口径二 ─────────────────────────────────────────────────────────── */
console.log('\n=== 口径二：audit 字段自身的三个统计量（README:74 / check-docs:951-958 有断言）===');
const lens = Object.values(rewrites).map((r) => r.after.length).sort((a, b) => a - b);
const beforeLens = Object.values(rewrites).map((r) => r.before.length).sort((a, b) => a - b);
const sum2 = (a) => a.reduce((x, y) => x + y, 0);
console.log(`改写前  最短 ${beforeLens[0]}  最长 ${beforeLens[beforeLens.length - 1]}  中位 ${beforeLens[Math.floor(beforeLens.length / 2)]}  合计 ${sum2(beforeLens)}`);
console.log(`改写后  最短 ${lens[0]}  最长 ${lens[lens.length - 1]}  中位 ${lens[Math.floor(lens.length / 2)]}  合计 ${sum2(lens)}`);
console.log(`压缩到  ${(sum2(lens) / sum2(beforeLens) * 100).toFixed(1)}%（${sum2(beforeLens)} → ${sum2(lens)} 字，少 ${sum2(beforeLens) - sum2(lens)} 字）`);
console.log(`\nREADME:74 现写「最短 216 字、最长 444 字、全库合计 11,365 字，中位数 314」→ 四个数全部要改。`);

/* S13 那条专属断言：改写后 S13 还必须不含「反套路改造三指标」 */
const s13 = rewrites.S13.after;
console.log(`S13 含「反套路改造三指标」？ ${s13.includes('反套路改造三指标') ? '❌ 含' : '✅ 不含'}（check-docs:974 的断言仍成立）`);
