const fs = require('fs');
const R = 'D:/Web/style/prototypes/S14-zero-g-launch-sequence/';
const html = fs.readFileSync(R + 'index.html', 'utf8');
// extract each tag block: style vars + title text
const blocks = [...html.matchAll(/<article class="tag[^>]*style="([^"]*)"[^>]*>([\s\S]*?)<\/article>/g)];
console.log('tag blocks matched:', blocks.length);
const rows = [];
for (const [, style, inner] of blocks) {
  const m = {};
  for (const kv of style.split(';')) {
    const [k, v] = kv.split(':');
    if (k && v) m[k.trim()] = v.trim();
  }
  const titleM = inner.match(/class="tag__title">([^<]*)</);
  const bodyM = inner.match(/class="tag__body">([\s\S]*?)</);
  const title = titleM ? titleM[1] : '';
  const body = bodyM ? bodyM[1] : '';
  const tl = [...title].length, bl = [...body].length;
  rows.push({ i: m['--i'], w: +m['--w'], dx: +m['--dx'], dy: +m['--dy'], ox: +m['--ox'], ord: m['--ord'], tl, bl, title });
}
console.log('i  w    dx     dy     ox   ord  titleLen bodyLen  title');
for (const r of rows.sort((a, b) => a.i - b.i)) {
  console.log([r.i.padStart(2), String(r.w).padEnd(4), String(r.dx).padEnd(6), String(r.dy).padEnd(7), String(r.ox).padEnd(4), String(r.ord).padEnd(4), String(r.tl).padEnd(8), String(r.bl).padEnd(7), r.title].join(' '));
}
// correlation w vs titleLen
function corr(a, b) {
  const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return num / Math.sqrt(da * db);
}
console.log('\ncorr(w, titleLen) =', corr(rows.map(r => r.w), rows.map(r => r.tl)).toFixed(3));
console.log('corr(w, bodyLen)  =', corr(rows.map(r => r.w), rows.map(r => r.bl)).toFixed(3));
console.log('corr(dy, bodyLen) =', corr(rows.map(r => r.dy), rows.map(r => r.bl)).toFixed(3));
