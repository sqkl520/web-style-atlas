// 对比提示词长度：HEAD（本轮前） vs 现在（本轮后），回答"变长后是否还在合理范围"
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ROOT = 'D:/Web/style';
function load(sel) {
  const doc = { createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], body: { appendChild() {} }, head: { appendChild() {} }, getElementById: () => null };
  const c = { window: {}, document: doc, navigator: { clipboard: { writeText: async () => {} } }, console };
  c.globalThis = c;
  vm.createContext(c);
  for (const f of ['data.js', 'prompts.js', 'prompt-copy.js']) {
    try { vm.runInContext(readFileSync(`${sel}/${f}`, 'utf8'), c); } catch {}
  }
  return c.window;
}
const head = load(ROOT + '/deliverables/64-verify/snap/head');
const now = load(ROOT + '/prototypes/_selection');

const han = (t) => (t.match(/[\u4e00-\u9fff]/g) || []).length;
const rows = [];
for (const s of now.SCHEMES) {
  let a = '', b = '';
  try { a = head.buildStylePrompt(s.id); } catch { a = ''; }
  try { b = now.buildStylePrompt(s.id); } catch { b = ''; }
  rows.push({ id: s.id, headHan: han(a), nowHan: han(b), headLen: a.length, nowLen: b.length,
    hasSentence: b.indexOf('最难被复用') >= 0, headHas: a.indexOf('最难被复用') >= 0 });
}
console.log('id   HEAD汉字  NOW汉字  差   HEAD字符 NOW字符  含"最难被复用"句');
for (const r of rows) {
  console.log(`${r.id}   ${String(r.headHan).padStart(5)}   ${String(r.nowHan).padStart(5)}  ${String(r.nowHan - r.headHan).padStart(3)}   ${String(r.headLen).padStart(5)}  ${String(r.nowLen).padStart(5)}   ${r.hasSentence ? 'Y' : 'n'}`);
}
const diffs = rows.map((r) => r.nowHan - r.headHan);
const hs = rows.map((r) => r.headHan).sort((a, b) => a - b);
const ns = rows.map((r) => r.nowHan).sort((a, b) => a - b);
console.log(`\nHEAD 汉字 min/median/max: ${hs[0]} / ${hs[15]} / ${hs[hs.length - 1]}`);
console.log(`NOW  汉字 min/median/max: ${ns[0]} / ${ns[15]} / ${ns[ns.length - 1]}`);
console.log(`每条平均增加: ${(diffs.reduce((a, b) => a + b, 0) / 30).toFixed(0)} 字（min ${Math.min(...diffs)}, max ${Math.max(...diffs)}）`);
console.log(`含该句: HEAD ${rows.filter((r) => r.headHas).length}/30 → NOW ${rows.filter((r) => r.hasSentence).length}/30`);
console.log(`NOW 汉字 > 1200 的案: ${rows.filter((r) => r.nowHan > 1200).map((r) => r.id + ':' + r.nowHan).join(' ') || '无'}`);
