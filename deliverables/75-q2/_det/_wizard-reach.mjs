import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(readFileSync('prototypes/_selection/data.js', 'utf8'), ctx);
const S = ctx.window.SCHEMES;

// 复刻 wizard.js 的五个轴
const satOf = (hex) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim()); if (!m) return 0;
  const n = parseInt(m[1], 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return 0; const d = mx - mn; return l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); };
const loudnessOf = (p) => Math.max(0, ...(p || []).map(satOf));
const stretch = (arr, v) => { const mn = Math.min(...arr), mx = Math.max(...arr); return mx === mn ? 1 : 2 * (v - mn) / (mx - mn); };
const THR = { '低': 0, '中': 1, '高': 2 };

const ALL = S.filter((r) => r.gate);
const words = ALL.map((r) => (typeof r.gate.words === 'number' ? r.gate.words : 0));
const pics = ALL.map((r) => (typeof r.gate.realPictures === 'number' ? r.gate.realPictures : 0));
const louds = ALL.map((r) => loudnessOf(r.palette));

const V = ALL.map((r) => ({
  id: r.id,
  load: stretch(words, r.gate.words || 0), img: stretch(pics, r.gate.realPictures || 0),
  loud: stretch(louds, loudnessOf(r.palette)), guide: THR[r.threshold] === undefined ? 1 : THR[r.threshold],
}));
V.forEach((v) => (v.fear = Math.min(2, v.loud * 0.6 + (1) * 0.4)));

// 穷举 3*3*3*2*3 = 162 种答案，看每案被排进前三多少次
const ORDER = ['load', 'img', 'loud', 'guide', 'fear'];
const scores = {};
for (const id of ALL.map((r) => r.id)) scores[id] = 0;
let combos = 0; const unreachable = new Set(ALL.map((r) => r.id));
for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) for (let d = 0; d < 2; d++) for (let e = 0; e < 3; e++) {
  const ans = { load: a, img: b, loud: c, guide: d, fear: e }; combos++;
  const ranked = V.map((v) => { let s = 0; for (const k of ORDER) { const df = v[k] - ans[k]; s += df * df; } return { id: v.id, s }; })
    .sort((x, y) => x.s - y.s);
  const top3 = ranked.slice(0, 3).map((x) => x.id);
  top3.forEach((id) => { scores[id]++; unreachable.delete(id); });
}
console.log('=== 向导能推荐到哪些案（穷举', combos, '种答案组合，取前三）===');
const sorted = Object.entries(scores).sort((x, y) => y[1] - x[1]);
sorted.forEach(([id, n]) => console.log(' ', id, String(n).padStart(4), '次', n === 0 ? ' ← 永远推不到' : ''));
console.log('\n永远推不到的案:', [...unreachable].join(' ') || '（无）');
console.log('分布不均：最高的案出现', Math.max(...Object.values(scores)), '次，最低（非零）', Math.min(...Object.values(scores).filter((n) => n > 0)), '次');

// 补测：向导的 img 轴用的是 gate.realPictures（渲染实测），而提示词的 minPics（req）是设计意图。
// 这两个数在 30 案里差多少？如果差得大，那「用户说『基本不用图』」时向导与提示词给的是两个答案。
console.log('\n=== img 轴：gate.realPictures（向导用） vs minPics（提示词用）===');
const P = (await import('node:vm')).default;
const ctx2 = { window: {} }; P.createContext(ctx2);
P.runInContext(readFileSync('prototypes/_selection/prompts.js', 'utf8'), ctx2);
const cap = Object.fromEntries(ctx2.window.STYLE_PROMPTS.schemes.map((s) => [s.id, s.capacity || {}]));
console.log('案   realPictures  minPics  差');
let big = 0;
for (const r of ALL) {
  const rp = r.gate.realPictures || 0, mp = cap[r.id].minPics ?? null;
  const d = mp === null ? null : rp - mp;
  if (d !== null && Math.abs(d) >= 3) big++;
  console.log(r.id, String(rp).padStart(11), String(mp).padStart(8), String(d).padStart(5), Math.abs(d) >= 3 ? '  ← 差 ≥3' : '');
}
console.log('\n差 ≥3 的案数:', big, '/ 30');
