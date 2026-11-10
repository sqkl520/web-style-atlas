import fs from 'fs';
import vm from 'vm';

const root = 'D:/Web/style';
const sandbox = { window: {}, console, Math, JSON, Set, Map, Object, Array, Number, String, isNaN, parseInt, parseFloat, RegExp, Date };
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(root + '/prototypes/_selection/data.js', 'utf8'), sandbox, { filename: 'data.js' });
const ALL = sandbox.window.SCHEMES.filter(r => r.gate);

function satOf(hex) {
  if (!hex) return 0;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx === mn) return 0;
  const l = (mx + mn) / 2;
  return l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn);
}
function loudnessOf(p) { let b = 0; (p || []).forEach(h => { const s = satOf(h); if (s > b) b = s; }); return b; }
const num = (v, d) => typeof v === 'number' ? v : d;
const words = ALL.map(r => num(r.gate.words, 0));
const pics = ALL.map(r => num(r.gate.realPictures, 0));
const louds = ALL.map(r => loudnessOf(r.palette));
function stretch(arr, v) { const mn = Math.min(...arr), mx = Math.max(...arr); if (mx === mn) return 1; return (v - mn) / (mx - mn) * 2; }
const TONE_BOLD = { '混乱活力 / 街头': 2, '荒诞幽默 / 玩心': 2, '奢华暗黑 / 高定': 1.5, '温暖手作 / 人味': 1, '机能冷峻 / 工业': 1, '冷静克制 / 工程感': 0.5, '学术档案 / 严肃出版': 0.5 };
const THR = { '低': 0, '中': 1, '高': 2 };
const V = ALL.map(r => {
  const loud = stretch(louds, loudnessOf(r.palette));
  let tb = TONE_BOLD[r.tone]; if (tb === undefined) tb = 1;
  return { id: r.id, r, load: stretch(words, num(r.gate.words, 0)), img: stretch(pics, num(r.gate.realPictures, 0)), loud,
    guide: THR[r.threshold] === undefined ? 1 : THR[r.threshold], fear: Math.min(2, loud * 0.6 + tb * 0.4),
    words: num(r.gate.words, 0), pics: num(r.gate.realPictures, 0), loudRaw: Math.round(loudnessOf(r.palette) * 100),
    tone: r.tone, threshold: r.threshold, failIds: (r.gate.failIds || []) };
});
const NQ = { load: 3, img: 3, loud: 3, guide: 2, fear: 3 };
const ORDER = ['load', 'img', 'loud', 'guide', 'fear'];
const LABEL = {
  load: v => v.words + ' 字正文', img: v => v.pics + ' 张真实图片',
  loud: v => '彩度 ' + v.loudRaw + '%', guide: v => '认知门槛「' + v.threshold + '」', fear: v => '调性「' + v.tone + '」',
};
function toSlot(v, n) { const idx = Math.round(v * (n - 1)); return Math.max(0, Math.min(n - 1, idx)); }
function diffs(v, ans) { return ORDER.map(k => { const slot = toSlot(v[k], NQ[k]), want = ans[k]; return { k, slot, want, d: Math.abs(slot - want) }; }).sort((a, b) => a.d - b.d); }
const isMatch = x => x.d === 0;
function reasonsFor(v, ans, wantMatch) {
  const list = diffs(v, ans).filter(x => wantMatch ? isMatch(x) : !isMatch(x));
  if (!list.length) return wantMatch ? '五项都落在你要的档位里' : '五项都接近你要的档位——它被排到最后是因为别人更近';
  return list.slice(0, 3).map(x => wantMatch ? LABEL[x.k](v) : LABEL[x.k](v)).join(' | ');
}
function score(v, ans) { let d = 0; ORDER.forEach(k => { const df = v[k] - ans[k]; d += df * df; }); return d; }

// Enumerate 162 combos (3*3*3*2*3=162)
const OPT = { load: [0, 1, 2], img: [0, 1, 2], loud: [0, 1, 2], guide: [0, 1], fear: [0, 1, 2] };
const combos = [];
for (const load of OPT.load) for (const img of OPT.img) for (const loud of OPT.loud) for (const guide of OPT.guide) for (const fear of OPT.fear) combos.push({ load, img, loud, guide, fear });
console.log('combos', combos.length);

let lieZeroMatch = [];      // recommended card with ZERO matching axes but says '五项都落在你要的档位里'
let zeroMatchTop3 = 0, top3Cards = 0;
const fearSlotSeen = new Set();
let fearNeverZero = 0;

for (const ans of combos) {
  const ranked = V.slice().sort((a, b) => score(a, ans) - score(b, ans));
  const pick = ranked.slice(0, 3);
  for (const v of pick) {
    top3Cards++;
    const m = diffs(v, ans).filter(isMatch).length;
    const why = reasonsFor(v, ans, true);
    if (m === 0) { zeroMatchTop3++; lieZeroMatch.push({ ans: JSON.stringify(ans), id: v.id, why }); }
  }
  V.forEach(v => fearSlotSeen.add(toSlot(v.fear, 3)));
  if (!V.some(v => toSlot(v.fear, 3) === 0)) fearNeverZero++;
}
console.log('top3 cards total', top3Cards);
console.log('top3 cards with ZERO matched axes:', zeroMatchTop3, '(these print "五项都落在你要的档位里")');
console.log('sample lies:'); lieZeroMatch.slice(0, 6).forEach(x => console.log('  ', x.ans, x.id, '->', x.why));
console.log('\nfear slots ever seen across all cases:', [...fearSlotSeen].sort(), '-> slot 0 reachable?', fearSlotSeen.has(0));
console.log('combos where user answered fear=0 (怕做错):', combos.filter(c => c.fear === 0).length);

// how many combos get zero fear match when ans.fear===0
let fear0NoMatch = 0;
for (const ans of combos.filter(c => c.fear === 0)) {
  const ranked = V.slice().sort((a, b) => score(a, ans) - score(b, ans));
  if (!ranked.slice(0, 3).some(v => isMatch(diffs(v, ans).find(x => x.k === 'fear')))) fear0NoMatch++;
}
console.log('combos with ans.fear=0 where no top3 case matches fear:', fear0NoMatch, '/', combos.filter(c => c.fear === 0).length);
