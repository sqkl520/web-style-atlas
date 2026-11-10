import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/Web/style/prototypes';
function walk(d) {
  let o = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) o = o.concat(walk(p)); else o.push(p);
  }
  return o;
}
let tot = 0, orphTot = 0;
const rows = [];
for (const d of fs.readdirSync(ROOT).filter(x => /^S\d\d-/.test(x)).sort()) {
  const dir = path.join(ROOT, d);
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(dir, 'style.css'), 'utf8');
  const refs = new Set();
  for (const m of html.matchAll(/(?:src|srcset)="([^"]+)"/g))
    m[1].split(',').forEach(pp => { const u = pp.trim().split(/\s+/)[0]; if (/assets\//.test(u)) refs.add(u.replace(/^\.\//, '')); });
  for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) { const u = m[1].replace(/^\.\//, ''); if (/assets\//.test(u)) refs.add(u); }
  const assetsDir = path.join(dir, 'assets');
  if (!fs.existsSync(assetsDir)) continue;
  const files = walk(assetsDir).filter(f => /\.(png|jpe?g|webp|avif|gif|svg|woff2?|ps1|py|md|json|log|ndjson)$/i.test(f));
  const imgFiles = files.filter(f => /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(f));
  const orphan = imgFiles.filter(f => !refs.has(path.relative(dir, f).split(path.sep).join('/')));
  const ob = orphan.reduce((a, f) => a + fs.statSync(f).size, 0);
  const tb = imgFiles.reduce((a, f) => a + fs.statSync(f).size, 0);
  tot += tb; orphTot += ob;
  rows.push({ id: d.slice(0, 3), onDisk: imgFiles.length, referenced: refs.size, orphan: orphan.length, orphanMB: +(ob / 1048576).toFixed(2), totalMB: +(tb / 1048576).toFixed(2), orphanList: orphan.map(f => path.basename(f)).slice(0, 6) });
  console.log(d.slice(0, 3), 'imgOnDisk=' + String(imgFiles.length).padStart(3), 'referenced=' + String(refs.size).padStart(3), 'orphan=' + String(orphan.length).padStart(3), (ob / 1048576).toFixed(2) + 'MB / ' + (tb / 1048576).toFixed(2) + 'MB', orphan.length ? '  e.g. ' + orphan.slice(0, 3).map(f => path.basename(f)).join(',') : '');
}
console.log('TOTAL', (tot / 1048576).toFixed(1) + 'MB', 'orphan', (orphTot / 1048576).toFixed(1) + 'MB', (100 * orphTot / tot).toFixed(1) + '%');
fs.writeFileSync('D:/Web/style/deliverables/64-scheme-quality/assets-weight.json', JSON.stringify(rows, null, 1));
