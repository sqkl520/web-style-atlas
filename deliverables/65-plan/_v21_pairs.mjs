// 人工核对：「跳脱之处」与已有机制句的语义关系（逐案并列打印）
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

for (const id of ['S01','S05','S10','S14','S16','S22','S26','S30']) {
  const r = S.find((x) => x.id === id);
  const s = J.schemes.find((x) => x.id === id);
  const mech = (s.dna && s.dna.mechanism) || '';
  const t = getTiao(r.audit || '');
  console.log(`\n===== ${id} =====`);
  console.log(' plain(一句话定义): ' + (s.plain || ''));
  console.log(' 机制句(已在提示词): ' + mech);
  console.log(' 跳脱之处:         ' + (t || '（无）'));
}
