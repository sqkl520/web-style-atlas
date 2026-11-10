import fs from 'fs';
import vm from 'vm';

const root = 'D:/Web/style';
const sandbox = { window: {}, console, Math, JSON, Set, Map, Object, Array, Number, String, isNaN, parseInt, parseFloat, RegExp, Date };
sandbox.global = sandbox;
vm.createContext(sandbox);
for (const f of ['prototypes/_selection/data.js']) {
  vm.runInContext(fs.readFileSync(root + '/' + f, 'utf8'), sandbox, { filename: f });
}
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

console.log('n =', ALL.length);
console.log('realPictures range', Math.min(...pics), '..', Math.max(...pics));
console.log('words range', Math.min(...words), '..', Math.max(...words));
console.log('loudness range', Math.min(...louds).toFixed(3), '..', Math.max(...louds).toFixed(3));

function stretch(arr, v) {
  const mn = Math.min(...arr), mx = Math.max(...arr);
  if (mx === mn) return 1;
  return (v - mn) / (mx - mn) * 2;
}
const TONE_BOLD = { '混乱活力 / 街头': 2, '荒诞幽默 / 玩心': 2, '奢华暗黑 / 高定': 1.5, '温暖手作 / 人味': 1, '机能冷峻 / 工业': 1, '冷静克制 / 工程感': 0.5, '学术档案 / 严肃出版': 0.5 };
const THR = { '低': 0, '中': 1, '高': 2 };
const V = ALL.map(r => {
  const loud = stretch(louds, loudnessOf(r.palette));
  let tb = TONE_BOLD[r.tone]; if (tb === undefined) tb = 1;
  return { id: r.id, r, load: stretch(words, num(r.gate.words, 0)), img: stretch(pics, num(r.gate.realPictures, 0)), loud,
    guide: THR[r.threshold] === undefined ? 1 : THR[r.threshold], fear: Math.min(2, loud * 0.6 + tb * 0.4),
    words: num(r.gate.words, 0), pics: num(r.gate.realPictures, 0), loudRaw: Math.round(loudnessOf(r.palette) * 100),
    tone: r.tone, threshold: r.threshold, fail: (r.gate.failIds || []).length };
});

// toSlot as implemented
const NQ = { load: 3, img: 3, loud: 3, guide: 2, fear: 3 };
function toSlot(v, n) { const idx = Math.round(v * (n - 1)); return Math.max(0, Math.min(n - 1, idx)); }
console.log('\n--- slot distribution per axis (implemented toSlot on 0..2 values) ---');
for (const k of Object.keys(NQ)) {
  const d = {};
  V.forEach(v => { const s = toSlot(v[k], NQ[k]); d[s] = (d[s] || 0) + 1; });
  console.log(k, 'slots', JSON.stringify(d));
}
console.log('\n--- loudRaw per case (LABEL prints "彩度 N%") ---');
console.log(V.map(v => v.id + ':' + v.loudRaw).join(' '));
console.log('\n--- fear is derived from loud+tone, not from data; loud constant?', new Set(V.map(v => v.loud.toFixed(3))).size, 'distinct');
