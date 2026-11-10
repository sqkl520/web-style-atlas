// 复核 reuse / 机制句 / risk 在提示词里的实际占比
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
console.log('STYLE_PROMPTS.schemes:', J.schemes.length);
let nReuse = 0, reuseChars = 0, nMech = 0, mechChars = 0;
for (const s of J.schemes) {
  if (s.dna && s.dna.reuse) { nReuse++; reuseChars += String(s.dna.reuse).length; }
  if (s.dna && s.dna.mechanism) { nMech++; mechChars += String(s.dna.mechanism).length; }
}
console.log('dna.reuse 有值:', nReuse, '/30  合计', reuseChars, '字 ｜均值', Math.round(reuseChars / nReuse));
console.log('dna.mechanism 有值:', nMech, '/30  合计', mechChars, '字 ｜均值', Math.round(mechChars / nMech));

const PL = JSON.parse(readFileSync(resolve('deliverables/65-plan/_v_out/promptlen.json'), 'utf8'));
const prompts = PL.prompts;
// 提示词里 risk 段的实际长度（220 截断后）
let riskInPrompt = 0, riskSrc = 0;
for (const r of S) {
  const cut = r.risk.length > 220 ? 220 : r.risk.length;
  riskInPrompt += cut;
  riskSrc += r.risk.length;
}
console.log('\nrisk 原文合计', riskSrc, '；进提示词（220 截）合计', riskInPrompt, '；被丢掉', riskSrc - riskInPrompt);
console.log('其中 8/30 被截断');

// 提示词分段占比（拿 S01 做样本，量各段）
const p = prompts['S01'];
const parts = p.split('\n\n');
console.log('\n=== S01 提示词分段长度（共 ' + p.length + ' 字）===');
parts.forEach((x, i) => console.log(`  段${i + 1} ${String(x.length).padStart(4)} 字 | ${x.slice(0, 40).replace(/\n/g, ' ')}`));
const tail = p.split('\n');
const bans = tail.filter((l) => /^[①②③④⑤⑥⑦⑧]/.test(l)).join('\n');
console.log('\n「防退化 8 条」合计', bans.length, '字');
const hard = tail.filter((l) => /^[1-5]\. /.test(l)).join('\n');
console.log('「视觉硬约束 + 结构约束」数字行合计', hard.length, '字');
