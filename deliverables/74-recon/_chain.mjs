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
// warm pale band per README criterion: hue 28-72 and L>=78
const warm = S.map(s => ({ id: s.id, ...hsl(s.palette[0]) }))
  .filter(x => x[0] >= 28 && x[0] <= 72 && x[2] >= 78)
  .sort((a, b) => a[0] - b[0]);
console.log('warm-pale (H28-72,L>=78):', warm.length);
console.log(warm.map(x => x.id + '(' + x[0].toFixed(0) + '/' + x[2].toFixed(0) + ')').join(' '));
// connected chain under dH<=3 AND dL<=3
function chain(pred) {
  let best = [], cur = [warm[0]];
  for (let i = 1; i < warm.length; i++) {
    if (pred(warm[i - 1], warm[i])) cur.push(warm[i]);
    else { if (cur.length > best.length) best = cur; cur = [warm[i]]; }
  }
  if (cur.length > best.length) best = cur;
  return best;
}
let b1 = chain((a, b) => b[0] - a[0] <= 3 && Math.abs(b[2] - a[2]) <= 3);
console.log('chain dH<=3 & dL<=3:', b1.length, b1.map(x => x.id).join(' '));
let b2 = chain((a, b) => b[0] - a[0] <= 3);
console.log('chain dH<=3 only:', b2.length, b2.map(x => x.id).join(' '));
// dE76 (CIE76 on Lab approximation via sRGB->Lab)
function lab(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  let r = parseInt(hex.slice(0, 2), 16) / 255, g = parseInt(hex.slice(2, 4), 16) / 255, b = parseInt(hex.slice(4, 6), 16) / 255;
  const f = v => (v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92);
  r = f(r); g = f(g); b = f(b);
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722);
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const t = v => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  x = t(x); y = t(y); z = t(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const L = S.map(s => ({ id: s.id, lab: lab(s.palette[0]) }));
let bestD = 0, pair = null;
for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
  const d = Math.hypot(L[i].lab[0] - L[j].lab[0], L[i].lab[1] - L[j].lab[1], L[i].lab[2] - L[j].lab[2]);
  if (d < 5) { /* count */ }
  if (d > bestD) { bestD = d; pair = L[i].id + '/' + L[j].id; }
}
let within5 = 0;
for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
  const d = Math.hypot(L[i].lab[0] - L[j].lab[0], L[i].lab[1] - L[j].lab[1], L[i].lab[2] - L[j].lab[2]);
  if (d <= 5) within5++;
}
console.log('bg pairs with dE76<=5:', within5, ' max pair distance:', bestD.toFixed(1), pair);
