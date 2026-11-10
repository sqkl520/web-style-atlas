import fs from 'fs';
import vm from 'vm';

const ROOT = 'D:/Web/style';
const sb = { window: {}, console, Math, JSON, Set, Map, Object, Array, Number, String, isNaN, parseInt, parseFloat, RegExp, Date };
sb.global = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(ROOT + '/prototypes/_selection/data.js', 'utf8'), sb, { filename: 'd' });
const ALL = sb.window.SCHEMES.filter(r => r.gate);

function satOf(hex) { if (!hex) return 0; const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim()); if (!m) return 0;
  const n = parseInt(m[1], 16); const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === mn) return 0; const l = (mx + mn) / 2;
  return l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn); }
const loudnessOf = p => { let b = 0; (p || []).forEach(h => { const s = satOf(h); if (s > b) b = s; }); return b; };
const num = (v, d) => typeof v === 'number' ? v : d;
const words = ALL.map(r => num(r.gate.words, 0));
const pics = ALL.map(r => num(r.gate.realPictures, 0));
const louds = ALL.map(r => loudnessOf(r.palette));
const stretch = (a, v) => { const lo = Math.min(...a), hi = Math.max(...a); return hi === lo ? 1 : (v - lo) / (hi - lo) * 2; };
const TONE_BOLD = { '混乱活力 / 街头': 2, '荒诞幽默 / 玩心': 2, '奢华暗黑 / 高定': 1.5, '温暖手作 / 人味': 1, '机能冷峻 / 工业': 1, '冷静克制 / 工程感': 0.5, '学术档案 / 严肃出版': 0.5 };
const THR = { '低': 0, '中': 1, '高': 2 };
const NQ = { load: 3, img: 3, loud: 3, guide: 2, fear: 3 };
const toSlot = (v, n) => Math.max(0, Math.min(n - 1, Math.round(v * (n - 1))));
const ORDER = ['load', 'img', 'loud', 'guide', 'fear'];
const ASK = { load: ['一屏说清', '三五屏', '很多栏目'], img: ['基本不用图', '几张就够', '图是主角'], loud: ['很安静', '有态度不吵', '要扎眼'], guide: ['三秒知道点哪', '愿意读进去'], fear: ['怕做错', '两头都不偏', '怕没记忆点'] };

const V = ALL.map(r => { const loud = stretch(louds, loudnessOf(r.palette)); let tb = TONE_BOLD[r.tone]; if (tb === undefined) tb = 1;
  return { id: r.id, load: stretch(words, num(r.gate.words, 0)), img: stretch(pics, num(r.gate.realPictures, 0)), loud,
    guide: THR[r.threshold] === undefined ? 1 : THR[r.threshold], fear: Math.min(2, loud * 0.6 + tb * 0.4),
    words: num(r.gate.words, 0), pics: num(r.gate.realPictures, 0), loudRaw: Math.round(loudnessOf(r.palette) * 100), tone: r.tone, threshold: r.threshold }; });

for (const [id, ans] of [['S05', { load: 0, img: 0, loud: 0, guide: 0, fear: 1 }], ['S07', { load: 0, img: 0, loud: 0, guide: 1, fear: 0 }]]) {
  const v = V.find(x => x.id === id);
  console.log('\n=== ' + id + ' under user answers ' + JSON.stringify(ans) + ' -> claims "五项都落在你要的档位里" ===');
  let matched = 0;
  ORDER.forEach(k => {
    const slot = toSlot(v[k], NQ[k]);
    const ok = slot === ans[k];
    if (ok) matched++;
    const shown = k === 'load' ? v.words + ' 字' : k === 'img' ? v.pics + ' 张图' : k === 'loud' ? '彩度 ' + v.loudRaw + '%' : k === 'guide' ? v.threshold : v.tone;
    console.log('  ' + k.padEnd(5), 'actual=' + shown.padEnd(22), 'slot=' + slot, 'user=' + ans[k] + ' (' + ASK[k][ans[k]] + ')', ok ? 'MATCH' : '*** MISMATCH ***');
  });
  console.log('  matched axes:', matched, '/5  -> sentence claims all five');
}
