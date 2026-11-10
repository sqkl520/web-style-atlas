import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(readFileSync('prototypes/_selection/data.js', 'utf8'), ctx);
const S = ctx.window.SCHEMES;

// ⚠️ 上面一版这里写成 endsWith('浅带')，而实际带名是「暖浅色带」——结尾两字是「色带」。
//    于是 20/30 案被判成「浅 vs 中」，全部是检查器自己的错。这是本仓库反复出现的缺陷类：
//    闸门读错字段 → 得到 undefined/错值 → 静默给出一个看起来正常的结论。
//    修法：不靠后缀，直接看带名里含哪个明度字，并对「解析不出来」显式抛错。
const BANDCLASS = (b) => {
  if (b.includes('浅')) return '浅';
  if (b.includes('中间')) return '中';
  if (b.includes('暗')) return '暗';
  throw new Error('带名解析不出来：' + b);   // 宁可炸，不要猜
};
// 自检：30 案全部能解析，且只解析出这三种
const allBands = [...new Set(S.map((s) => s.axes.band))];
allBands.forEach(BANDCLASS);
console.log('带名全集:', allBands.join(' / '), '→ 全部可解析 ✓\n');

const GROUND_OF = (y) => (y >= 0.5 ? '亮底' : y >= 0.12 ? '中间调' : '暗底');
const agree = { '亮底': '浅', '中间调': '中', '暗底': '暗' };

const rows = S.map((s) => {
  const a = s.axes;
  return { id: s.id, bg: s.bg, ground: a.ground, groundY: a.groundL / 100, band: a.band, bandCls: BANDCLASS(a.band), bandL: a.bandL };
});
const bad = rows.filter((r) => agree[r.ground] !== r.bandCls);
console.log('=== ground（WCAG relLum）与 band（HSL l）互相矛盾的案子 ===');
console.log('id   bg        ground   relLum  band          HSL-L  ground说  band说');
bad.forEach((r) => console.log(r.id, r.bg, r.ground.padEnd(8), r.groundY.toFixed(3).padStart(6), '  ' + r.band.padEnd(13), String(r.bandL).padStart(4), '  ' + agree[r.ground] + '      ' + r.bandCls));
console.log('\n矛盾案数:', bad.length, '/ 30');

const c = {};
rows.forEach((r) => (c[r.band] = (c[r.band] || 0) + 1));
console.log('\n=== 各带计数 ===');
console.log(Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join('  '));
const g = {};
rows.forEach((r) => (g[r.ground] = (g[r.ground] || 0) + 1));
console.log('ground 三分类:', JSON.stringify(g));
