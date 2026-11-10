import fs from 'fs';
import vm from 'vm';

const ROOT = 'D:/Web/style';
const sb = { window: {}, console, Math, JSON, Set, Map, Object, Array, Number, String, isNaN, parseInt, parseFloat, RegExp, Date };
sb.global = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(ROOT + '/prototypes/_selection/data.js', 'utf8'), sb, { filename: 'data.js' });
const ALL = sb.window.SCHEMES.filter(r => r.gate);
const P = (() => {
  const s2 = { window: {}, console, Math, JSON, Set, Map, Object, Array, Number, String, isNaN, parseInt, parseFloat, RegExp, Date, navigator: {} };
  s2.global = s2;
  s2.document = { addEventListener() {}, getElementById() { return null; }, createElement() { return { style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }; }, querySelectorAll() { return []; }, body: { appendChild() {}, removeChild() {} } };
  vm.createContext(s2);
  vm.runInContext(fs.readFileSync(ROOT + '/prototypes/_selection/data.js', 'utf8'), s2, { filename: 'data.js' });
  vm.runInContext(fs.readFileSync(ROOT + '/prototypes/_selection/prompts.js', 'utf8'), s2, { filename: 'p' });
  return s2.window;
})();

// ---------- claim 5: hint logic vs card warning ----------
console.log('=== claim 5: "粘给谁都行" (panel) vs "会留空位" (card) ===');
const PS = P.STYLE_PROMPTS;
let danger = [], reverse = [], okAll = [];
PS.schemes.forEach(s => {
  const rec = ALL.find(x => x.id === s.id);
  const riskyTopic = !!s.hard;
  const riskyCount = !!(s.capacity && s.capacity.degrades === 'yes');
  const panelSaysAllGood = !(riskyTopic || riskyCount);
  const cardWarns = !!(s.capacity && s.capacity.degrades === 'yes');
  if (panelSaysAllGood && cardWarns) danger.push(s.id);           // BAD: panel says fine, card warns
  if (!panelSaysAllGood && !cardWarns) reverse.push(s.id);        // acceptable: panel stricter
  if (panelSaysAllGood) okAll.push(s.id);
});
console.log('panel says "都行" BUT card warns (BAD):', danger.length, danger.join(',') || 'none');
console.log('panel warns but card neutral (safe direction):', reverse.length, reverse.join(','));
console.log('cases that say "粘给谁都行":', okAll.length, okAll.join(','));
console.log('s.hard set:', PS.schemes.filter(s => s.hard).map(s => s.id).join(','));

// ---------- evidence for one wizard lie ----------
console.log('\n=== evidence: combo 00001 -> S05 claims "五项都落在你要的档位里" ===');
const pics = ALL.map(r => r.gate.realPictures);
const words = ALL.map(r => r.gate.words);
const mn = Math.min(...pics), mx = Math.max(...pics);
const stretch = (a, v) => { const lo = Math.min(...a), hi = Math.max(...a); return hi === lo ? 1 : (v - lo) / (hi - lo) * 2; };
const toSlot = (v, n) => Math.max(0, Math.min(n - 1, Math.round(v * (n - 1))));
const s05 = ALL.find(r => r.id === 'S05');
const imgSlot05 = toSlot(stretch(pics, s05.gate.realPictures), 3);
console.log('S05 realPictures =', s05.gate.realPictures, '-> img slot', imgSlot05, '(user answered img=0 "基本不用图")');
console.log('pic range', mn, '..', mx);
const fearOf = r => { /* loud*tone */ return null; };
const s07 = ALL.find(r => r.id === 'S07');
console.log('combo 00010 -> S07 claimed all-five; S07 pics=', s07.gate.realPictures, 'imgSlot=', toSlot(stretch(pics, s07.gate.realPictures), 3), 'user img=0');
console.log('S07 fails:', (s07.gate.failIds || []).join(','));

// ---------- claim 2 exact evidence ----------
console.log('\n=== claim 2: font chains ===');
const s7 = PS.schemes.find(x => x.id === 'S07'), s30 = PS.schemes.find(x => x.id === 'S30');
console.log('S07 displayStack:', JSON.stringify(s7.dna.fonts.displayStack), '| contains 文津宋体:', s7.dna.fonts.displayStack.includes('文津宋体'));
console.log('S30 displayStack:', JSON.stringify(s30.dna.fonts.displayStack), '| contains Zhuque Fangsong:', s30.dna.fonts.displayStack.includes('Zhuque Fangsong'));
let hasDS = 0; PS.schemes.forEach(s => { if ((s.dna.fonts.displayStack || []).length) hasDS++; });
console.log('cases with non-empty displayStack:', hasDS, '/30');
