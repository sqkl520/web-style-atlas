import fs from 'fs';
import path from 'path';

const base = 'D:/Web/style/prototypes/_selection/';
const src = fs.readFileSync(base + 'data.js', 'utf8');

// split on top-level scheme objects by locating "shots": { ... } blocks
const shotBlocks = [];
const re = /"shots":\s*\{([\s\S]*?)\n\s*\}/g;
let m;
while ((m = re.exec(src))) shotBlocks.push(m[1]);
console.log('shot blocks found:', shotBlocks.length);

function grab(block, vp) {
  const mm = block.match(new RegExp('"' + vp + '":\\s*\\[([^\\]]*)\\]'));
  if (!mm) return [];
  return [...mm[1].matchAll(/"([^"]+\.jpg)"/g)].map(x => x[1]);
}
const per = shotBlocks.map(b => ({
  desktop: grab(b, 'desktop'),
  tablet: grab(b, 'tablet'),
  mobile: grab(b, 'mobile'),
}));
const size = rel => {
  try { return fs.statSync(path.resolve(base, rel)).size; } catch { return 0; }
};
const sum = arr => arr.reduce((a, p) => a + size(p), 0);

const dAll = per.flatMap(p => p.desktop), tAll = per.flatMap(p => p.tablet), mAll = per.flatMap(p => p.mobile);
console.log('counts desktop/tablet/mobile:', dAll.length, tAll.length, mAll.length);
console.log('bytes all desktops:', (sum(dAll) / 1048576).toFixed(2), 'MB');

// first load: each row emits 3 <img> (desktop/tablet/mobile); CSS hides 2nd,3rd but they still fetch
const firstLoadRows = per.reduce((a, p) => {
  if (p.desktop[0]) a += size(p.desktop[0]);
  if (p.tablet[0]) a += size(p.tablet[0]);
  if (p.mobile[0]) a += size(p.mobile[0]);
  return a;
}, 0);
const visibleOnly = per.reduce((a, p) => a + (p.desktop[0] ? size(p.desktop[0]) : 0), 0);
console.log('row thumbnails fetched (3 per row x30):', (firstLoadRows / 1048576).toFixed(2), 'MB');
console.log('  of which visually visible (desktop only):', (visibleOnly / 1048576).toFixed(2), 'MB');
console.log('  wasted on display:none images:', ((firstLoadRows - visibleOnly) / 1048576).toFixed(2), 'MB');

// detail panel open for the heaviest scheme
let worst = null, worstB = 0;
per.forEach((p, i) => {
  const b = sum(p.desktop) + sum(p.tablet) + sum(p.mobile);
  if (b > worstB) { worstB = b; worst = { i, b, n: p.desktop.length + p.tablet.length + p.mobile.length }; }
});
console.log('heaviest detail scheme', worst);
const avgDetail = per.reduce((a, p) => a + size(p.desktop[0] || '') + sum(p.tablet) + sum(p.mobile), 0) / per.length;
console.log('avg detail open cost (desktop thumbs loaded already; tablet+mobile full):',
  (avgDetail / 1048576).toFixed(2), 'MB');
