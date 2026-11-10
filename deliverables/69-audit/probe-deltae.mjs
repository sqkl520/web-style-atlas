// 探针 18：越界色是不是"声称色的深浅变体"？用 ΔE（CIE76 on Lab）量。
// 这个判据决定 palette-closed 的判决强度：如果是同一个色的 5% 深浅，那"新增彩色"的说法就过头了；
// 如果是完全不同色相，那就是真越界。
import { readFileSync, writeFileSync } from 'node:fs';
const DIR = 'D:/Web/style/deliverables/69-audit';
const con = JSON.parse(readFileSync(DIR + '/constraints.json', 'utf8'));
const col = JSON.parse(readFileSync(DIR + '/color-origins-v2.json', 'utf8'));

const toLab = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  let r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  r = lin(r); g = lin(g); b = lin(b);
  let X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  let Y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
  let Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  X = f(X); Y = f(Y); Z = f(Z);
  return { L: 116 * Y - 16, a: 500 * (X - Y), b: 200 * (Y - Z) };
};
const dE = (h1, h2) => {
  const p = toLab(h1), q = toLab(h2);
  return Math.round(Math.sqrt((p.L - q.L) ** 2 + (p.a - q.a) ** 2 + (p.b - q.b) ** 2) * 10) / 10;
};

const out = {};
let allD = [];
for (const id of Object.keys(con.per)) {
  const claimed = [...new Set(con.per[id].items.filter((i) => i.kind === 'palette').map((i) => i.params.hex))];
  const co = col[id];
  const extras = [...co.textArr.filter((x) => x.src !== 'claimed'), ...co.surfArr.filter((x) => x.src !== 'claimed' && x.a === 1)];
  const uniq = [...new Map(extras.map((x) => [x.hex, x])).values()].map((x) => {
    const ds = claimed.map((c) => ({ c, d: dE(x.hex, c) })).sort((a, b) => a.d - b.d);
    const w = x.n || 0, a = x.areaPct || 0;
    return { hex: x.hex, nearest: ds[0].c, dE: ds[0].d, n: w, areaPct: a, kind: x.src };
  }).sort((a, b) => a.dE - b.dE);
  out[id] = uniq;
  allD = allD.concat(uniq.map((u) => u.dE));
  const sig = uniq.filter((u) => (u.n >= 5 || u.areaPct >= 0.5));
  console.log(id.padEnd(4), '越界色=' + uniq.length, '显著=' + sig.length,
    '| ΔE: ' + sig.map((u) => u.hex + '→' + u.nearest + '(' + u.dE + ')').join(' '));
}
const buckets = { '≤3 同色微差': 0, '3–8 深浅变体': 0, '8–15 相邻色': 0, '>15 不同色': 0 };
for (const d of allD) { if (d <= 3) buckets['≤3 同色微差']++; else if (d <= 8) buckets['3–8 深浅变体']++; else if (d <= 15) buckets['8–15 相邻色']++; else buckets['>15 不同色']++; }
console.log('\n全部越界色的 ΔE 分布（到最近的声称色）：', JSON.stringify(buckets));
writeFileSync(DIR + '/deltaE.json', JSON.stringify({ per: out, buckets, all: allD }, null, 1), 'utf8');
