// 裁决 1 决胜 2：「跳脱之处」句 vs 提示词里**已有的**机制句（dna.mechanism）
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import vm from 'node:vm';

const SEL = resolve('prototypes/_selection');
function loadCtx() {
  const stub = () => ({ style: {}, classList: { add() {}, remove() {} }, addEventListener() {}, appendChild() {},
    querySelector: () => null, querySelectorAll: () => [], children: [], textContent: '', innerHTML: '' });
  const doc = { createElement: () => stub(), getElementById: () => stub(), querySelector: () => stub(),
    querySelectorAll: () => [], addEventListener() {}, body: stub() };
  const ctx = { window: {}, document: doc, console, navigator: { clipboard: { writeText: async () => {} } } };
  ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  for (const f of ['data.js', 'prompts.js', 'prompt-copy.js']) { try { vm.runInContext(readFileSync(join(SEL, f), 'utf8'), ctx, { filename: f }); } catch {} }
  return ctx;
}
const ctx = loadCtx();
const J = ctx.window.STYLE_PROMPTS;
const S = ctx.window.SCHEMES;

const getTiao = (a) => { const m = a.match(/跳脱之处(?:是|在于)?[：:]?\s*([^。]{4,60}?)。/); return m ? m[1].trim() : ''; };
const lcs = (a, b, min = 6) => {
  let best = 0;
  for (let len = Math.min(a.length, b.length); len >= min; len--) {
    for (let i = 0; i + len <= a.length; i++) if (b.includes(a.slice(i, i + len))) return len;
  }
  return 0;
};

console.log('=== 「跳脱之处」 vs 已有机制句（dna.mechanism） ===');
let dupCases = 0, tiaoTotal = 0;
for (const r of S) {
  const s = J.schemes.find((x) => x.id === r.id);
  const mech = (s && s.dna && s.dna.mechanism) ? String(s.dna.mechanism) : '';
  const plain = (s && s.plain) ? String(s.plain) : '';
  const t = getTiao(r.audit || '');
  if (!t) { console.log(`  ${r.id} 无跳脱句`); continue; }
  tiaoTotal++;
  const l1 = lcs(t, mech), l2 = lcs(t, plain);
  const dup = l1 >= 8;
  if (dup) dupCases++;
  console.log(`  ${r.id} LCS(机制)=${String(l1).padStart(2)} LCS(plain)=${String(l2).padStart(2)} ${dup ? '★与机制句高度重合' : ''}`);
  if (dup) { console.log(`      跳脱: ${t}`); console.log(`      机制: ${mech.slice(0, 80)}`); }
}
console.log(`\n跳脱句与机制句 LCS>=8 的案: ${dupCases}/${tiaoTotal}`);

// 再看：跳脱句里的「不是 X」——X 是不是就是提示词已禁的那三样
const NEG = /不是(?:.{0,10})(?:浮起|卡片|模糊|装饰|色|灰|游戏|画|算|设计者)/;
let negCount = 0;
console.log('\n=== 跳脱句的「不是 X」指向 ===');
for (const r of S) {
  const t = getTiao(r.audit || '');
  if (!t) continue;
  const m = t.match(/不是[^，。]{1,20}/);
  if (m) { negCount++; console.log(`  ${r.id}: ${m[0]}`); }
}
console.log(`\n含「不是 X」否定的跳脱句: ${negCount}/27  ← 这些否定的对象是否已在「防退化 8 条」里？`);

// 决定性统计：跳脱句里有多少字是「否定式」（不是X），多少是「命名一个新动作」
let negChars = 0, totChars = 0;
for (const r of S) {
  const t = getTiao(r.audit || '');
  if (!t) continue;
  totChars += t.length;
  const m = t.match(/不是[^，。]{1,25}/g);
  if (m) negChars += m.join('').length;
}
console.log(`\n跳脱句合计 ${totChars} 字，其中否定式 ${negChars} 字（${(negChars/totChars*100).toFixed(1)}%）`);
