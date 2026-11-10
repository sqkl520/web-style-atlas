const fs = require('fs');
const vm = require('vm');
const ctx = { window: {} };
ctx.window.window = ctx.window;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8'), ctx, { filename: 'data.js' });
const arr = ctx.window.SCHEMES;
const psrc = fs.readFileSync('D:/Web/style/prototypes/_selection/prompts.js', 'utf8');
const marker = 'window.STYLE_PROMPTS = ';
const P = JSON.parse(psrc.slice(psrc.indexOf(marker) + marker.length).replace(/;\s*$/, ''));
const hard = new Set(P.hardIds);
console.log('id  hard threshold structure minItems degrades');
const byThr = { '低': [0, 0], '中': [0, 0], '高': [0, 0] };
let hMin = [], nMin = [];
for (const r of arr) {
  const p = P.schemes.find(x => x.id === r.id);
  const t = (r.threshold || '').trim();
  const isH = hard.has(r.id);
  console.log([r.id, isH ? 'HARD' : '.   ', t, (r.structure || '').padEnd(22), String(p.capacity.minItems).padEnd(4), p.capacity.degrades].join(' '));
  if (byThr[t]) byThr[t][isH ? 1 : 0]++;
  (isH ? hMin : nMin).push(p.capacity.minItems);
}
console.log('\n门槛 × hard', JSON.stringify(byThr));
const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
console.log('hard minItems avg', avg(hMin), ' non-hard avg', avg(nMin));
console.log('hard degrades=yes', P.schemes.filter(s => s.hard && s.capacity.degrades === 'yes').length + '/9');
// structure type distribution
const st = {};
for (const r of arr) { const k = (r.structure || '?').split('（')[0]; st[k] = st[k] || [0, 0]; st[k][hard.has(r.id) ? 1 : 0]++; }
console.log('structure × hard', JSON.stringify(st));
// family
const fam = {};
for (const r of arr) { const k = (r.family || '?').split('（')[0]; fam[k] = fam[k] || [0, 0]; fam[k][hard.has(r.id) ? 1 : 0]++; }
console.log('family count', Object.keys(fam).length);
