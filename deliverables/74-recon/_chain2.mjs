import { readFileSync } from 'node:fs';
const root = 'D:/Web/style/prototypes/';
const sandbox = { window: {} };
new Function('window', readFileSync(root + '_selection/data.js', 'utf8'))(sandbox.window);
const S = sandbox.window.SCHEMES;
function hsl(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.slice(0, 2), 16) / 255, g = parseInt(hex.slice(2, 4), 16) / 255, b = parseInt(hex.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}
function graph(pred, items) {
  // union-find over pairs satisfying pred
  const par = items.map((_, i) => i);
  const find = x => par[x] === x ? x : (par[x] = find(par[x]));
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++)
    if (pred(items[i], items[j])) par[find(i)] = find(j);
  const groups = {};
  items.forEach((it, i) => { const r = find(i); (groups[r] = groups[r] || []).push(it.id); });
  return Object.values(groups).sort((a, b) => b.length - a.length);
}
const A = S.map(s => { const [h, sa, l] = hsl(s.palette[0]); return { id: s.id, h, s: sa, l }; });
for (const [dh, dl] of [[3, 3], [3, 100], [5, 5], [3, 1e9]]) {
  const g = graph((a, b) => {
    let d = Math.abs(a.h - b.h); if (d > 180) d = 360 - d;
    return d <= dh && Math.abs(a.l - b.l) <= dl;
  }, A);
  console.log(`dH<=${dh} dL<=${dl}: largest block ${g[0].length} :: ${g[0].join(' ')}`);
}
// How many distinct light levels
console.log('bgs with L>=78:', A.filter(x => x.l >= 78).length);
console.log('bgs with L<=15:', A.filter(x => x.l <= 15).length);
console.log('bgs 15<L<78:', A.filter(x => x.l > 15 && x.l < 78).map(x => x.id + ':' + x.l.toFixed(0)).join(' '));
