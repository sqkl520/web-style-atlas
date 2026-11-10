import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/Web/style/prototypes';
const dirs = fs.readdirSync(ROOT).filter(d => /^S\d\d-/.test(d)).sort();

function walk(d) {
  const out = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}

const rows = [];
for (const d of dirs) {
  const dir = path.join(ROOT, d);
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(dir, 'style.css'), 'utf8');
  const assetsDir = path.join(dir, 'assets');
  const files = fs.existsSync(assetsDir) ? walk(assetsDir) : [];

  // referenced assets (images only)
  const refs = new Set();
  for (const m of html.matchAll(/(?:src|srcset)="([^"]+)"/g))
    m[1].split(',').forEach(part => { const u = part.trim().split(/\s+/)[0]; if (/assets\/.+\.(png|jpe?g|webp|avif|gif|svg)$/i.test(u)) refs.add(u.replace(/^\.\//, '')); });
  for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
    const u = m[1].trim().replace(/^\.\//, '');
    if (/assets\/.+\.(png|jpe?g|webp|avif|gif|svg)$/i.test(u)) refs.add(u);
  }
  const usedPhotos = [...refs].filter(r => !/texture-|grain|paper-|cursor|vignette|scanline|sprite/.test(r));

  // credits records
  const creditFiles = files.filter(f => /credits?.*\.json$/i.test(f));
  let recs = [];
  for (const cf of creditFiles) {
    try {
      const j = JSON.parse(fs.readFileSync(cf, 'utf8').replace(/^\uFEFF/, ''));
      const arr = Array.isArray(j) ? j : (Array.isArray(j.credits) ? j.credits : (Array.isArray(j.value) ? j.value : []));
      for (const r of arr) if (r && typeof r === 'object') recs.push({ ...r, _src: path.basename(cf) });
    } catch { /* recorded elsewhere */ }
  }
  const creditMd = files.find(f => /CREDITS\.md$/i.test(f));
  const md = creditMd ? fs.readFileSync(creditMd, 'utf8') : '';

  const names = new Set(recs.map(r => path.basename(String(r.file || '')).toLowerCase()));
  const titles = recs.map(r => String(r.title || '')).join(' ');
  const missing = []; const present = [];
  for (const u of usedPhotos) {
    const base = path.basename(u).toLowerCase();
    const stem = base.replace(/\.(png|jpe?g|webp|avif|gif|svg)$/, '').replace(/-p$/, '');
    const inJson = names.has(base) || [...names].some(n => n && (n.includes(stem) || stem.includes(n.replace(/\.\w+$/, ''))));
    const inMd = md.toLowerCase().includes(stem) || md.includes(u) || md.toLowerCase().includes(base);
    if (inJson || inMd) present.push(u); else missing.push(u);
  }

  // license types present
  const licenses = {};
  for (const r of recs) { const L = String(r.license || '(none)').trim(); licenses[L] = (licenses[L] || 0) + 1; }
  const mdLicenses = {};
  for (const m of md.matchAll(/\|\s*(CC[^|]{0,40}|公有领域|Public domain|无已知限制|No restrictions|CC0[^|]{0,20})/gi)) {
    const k = m[1].trim().slice(0, 40); mdLicenses[k] = (mdLicenses[k] || 0) + 1;
  }

  rows.push({
    dir: d,
    creditJson: creditFiles.map(f => path.basename(f)),
    recCount: recs.length,
    usedPhotoCount: usedPhotos.length,
    covered: present.length,
    missing,
    licenses,
    mdLicenses,
    hasMd: !!creditMd,
    mdLength: md.length,
    mdMentions: {
      commons: (md.match(/commons\.wikimedia\.org/g) || []).length,
      nasa: (md.match(/nasa/gi) || []).length,
      'no-license-note': (md.match(/见来源页|未标注|没有保留|无法确认/g) || []).length,
      'generated': (md.match(/生成物|程序化|纹理/g) || []).length
    }
  });
}
fs.writeFileSync('D:/Web/style/deliverables/64-scheme-quality/licensing2.json', JSON.stringify(rows, null, 1));
const p = (s, n) => String(s).padEnd(n);
console.log(p('scheme', 37) + p('json', 18) + p('recs', 5) + p('used', 5) + p('cov', 5) + 'missing');
for (const r of rows) console.log(p(r.dir.slice(0, 36), 37) + p(r.creditJson.join(','), 18) + p(r.recCount, 5) + p(r.usedPhotoCount, 5) + p(r.covered, 5) + (r.missing.length ? r.missing.join(',') : '-'));
console.log('\n--- licenses in json ---');
for (const r of rows) console.log(r.dir.slice(0, 12), JSON.stringify(r.licenses));
