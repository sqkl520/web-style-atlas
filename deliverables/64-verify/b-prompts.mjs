// 路线 B：buildStylePrompt 逐案核查（30 案全量）
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const ROOT = 'D:/Web/style';
const SEL = ROOT + '/prototypes/_selection';
const ctx = { window: {}, document: { createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], body: { appendChild() {} }, head: { appendChild() {} } }, console };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['data.js', 'prompts.js', 'prompt-copy.js']) {
  try { vm.runInContext(readFileSync(`${SEL}/${f}`, 'utf8'), ctx, { filename: f }); }
  catch (e) { console.log('LOAD FAIL', f, e.message); }
}
console.log('window keys:', Object.keys(ctx.window).join(','));
console.log('typeof buildStylePrompt:', typeof ctx.window.buildStylePrompt);
const SCHEMES = ctx.window.SCHEMES || [];
const PROMPTS = ctx.window.STYLE_PROMPTS || {};
console.log('SCHEMES:', SCHEMES.length, 'STYLE_PROMPTS:', Object.keys(PROMPTS).length);

const out = [];
for (const sc of SCHEMES) {
  let txt = '';
  try { txt = ctx.window.buildStylePrompt(sc.id); } catch (e) { txt = 'ERR:' + e.message; }
  const hasMultiver = txt.includes('多版本信息');
  const hasLanding = txt.includes('可落地要点');
  const landingVal = sc.landing || '';
  // 取 landing 里"最难被复用"那半句，看是否出现在提示词中
  const halfIdx = landingVal.indexOf('最难被复用');
  const half = halfIdx >= 0 ? landingVal.slice(halfIdx, halfIdx + 40) : '';
  out.push({ id: sc.id, chars: txt.length, hasMultiver, hasLanding, landingLen: landingVal.length, halfInPrompt: half ? txt.includes(half.slice(0, 20)) : null, half, err: txt.startsWith('ERR:') ? txt : null });
}
const p = (s, n) => String(s).padEnd(n);
console.log(p('id', 5) + p('chars', 7) + p('多版本信息', 12) + p('可落地要点', 12) + p('landingLen', 12) + 'half-in-prompt');
for (const r of out) console.log(p(r.id, 5) + p(r.chars, 7) + p(r.hasMultiver, 12) + p(r.hasLanding, 12) + p(r.landingLen, 12) + r.halfInPrompt);
console.log('\n多版本信息 命中案数:', out.filter((r) => r.hasMultiver).length, '/30');
console.log('可落地要点 命中案数:', out.filter((r) => r.hasLanding).length, '/30');
const lens = out.map((r) => r.chars).sort((a, b) => a - b);
console.log('长度 min/median/max:', lens[0], lens[15], lens[lens.length - 1]);
console.log('超 1500 的案:', out.filter((r) => r.chars > 1500).map((r) => r.id + ':' + r.chars).join(' '));
writeFileSync(ROOT + '/deliverables/64-verify/b-prompts.json', JSON.stringify(out, null, 1));
