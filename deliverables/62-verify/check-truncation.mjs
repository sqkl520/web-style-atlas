import fs from 'fs';
import vm from 'vm';

const ROOT = 'D:/Web/style';
const s2 = { window: {}, console, Math, JSON, Set, Map, Object, Array, Number, String, isNaN, parseInt, parseFloat, RegExp, Date, navigator: {} };
s2.global = s2;
s2.document = { addEventListener() {}, getElementById() { return null; }, createElement() { return { style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }; }, querySelectorAll() { return []; }, body: { appendChild() {}, removeChild() {} } };
vm.createContext(s2);
vm.runInContext(fs.readFileSync(ROOT + '/prototypes/_selection/data.js', 'utf8'), s2, { filename: 'data.js' });
vm.runInContext(fs.readFileSync(ROOT + '/prototypes/_selection/prompts.js', 'utf8'), s2, { filename: 'p' });
vm.runInContext(fs.readFileSync(ROOT + '/deliverables/62-verify/frozen-prompt-copy.js', 'utf8'), s2, { filename: 'pc' });
const W = s2.window;

// CJK-capable detector mirroring prompt-copy.js CJK_RE
const CJK = /(Noto (Serif|Sans) (SC|TC|JP)|LXGW|WenKai|WenJin|文津|Zhuque|Fangsong|思源|宋体|黑体|Songti|Glow Sans|KaiTi|Kaiti|STKaiti|仿宋|楷)/i;

console.log('=== slice(0,3) truncation: does the printed chain keep a CJK face? ===');
const lost = [];
W.STYLE_PROMPTS.schemes.forEach(s => {
  const f = s.dna.fonts || {};
  const ds = f.displayStack || [], bs = f.bodyStack || [];
  const dsOut = ds.slice(0, 3), bsOut = bs.slice(0, 3);
  const dsFullHasCJK = ds.some(x => CJK.test(x));
  const dsOutHasCJK = dsOut.some(x => CJK.test(x));
  const bsFullHasCJK = bs.some(x => CJK.test(x));
  const bsOutHasCJK = bsOut.some(x => CJK.test(x));
  const prompt = W.buildStylePrompt(s.id);
  const hardBan = prompt.includes('也不要跳过上面这条链直接回退成系统默认无衬线');
  if (bsFullHasCJK && !bsOutHasCJK) lost.push({ id: s.id, kind: 'BODY', full: bs, out: bsOut, hardBan });
  if (dsFullHasCJK && !dsOutHasCJK) lost.push({ id: s.id, kind: 'TITLE', full: ds, out: dsOut, hardBan });
});
console.log('cases where printed 3-item chain lost ALL CJK faces:', lost.length);
lost.forEach(l => console.log('  ', l.id, l.kind, '|', l.out.join(' → '), '| full:', l.full.join(' → '), '| hardBan:', l.hardBan));

console.log('\n=== cases whose printed TITLE chain has no CJK but banned from falling back ===');
let bad = [];
W.STYLE_PROMPTS.schemes.forEach(s => {
  const p = W.buildStylePrompt(s.id);
  if (!p.includes('也不要跳过上面这条链直接回退成系统默认无衬线')) return;
  const f = s.dna.fonts || {};
  const ds = (f.displayStack || []).slice(0, 3);
  const sameFace = p.includes('全站只用一款字体');
  const chain = sameFace ? (f.displayStack || []) : ds;
  if (chain.length && !chain.some(x => CJK.test(x))) bad.push(s.id + ' [' + chain.join(' → ') + ']');
});
console.log(bad.length ? bad.join('\n') : 'none');
