import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/Web/style/prototypes';
const dirs = fs.readdirSync(ROOT).filter(d => /^S\d\d-/.test(d)).sort();

function walk(d) {
  let out = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else out.push(p);
  }
  return out;
}

const out = [];
for (const d of dirs) {
  const dir = path.join(ROOT, d);
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(dir, 'style.css'), 'utf8');

  // images referenced by the page
  const refs = new Set();
  for (const m of html.matchAll(/(?:src|srcset|href)="([^"]+)"/g)) {
    const v = m[1].trim();
    if (/^assets\//.test(v)) v.split(',').forEach(part => { const u = part.trim().split(/\s+/)[0]; if (/^assets\//.test(u)) refs.add(u); });
  }
  for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
    const v = m[1].trim();
    if (/^(\.\/)?assets\//.test(v)) refs.add(v.replace(/^\.\//, ''));
  }
  const imgRefs = [...refs].filter(r => /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(r));

  // credits files
  const assetsDir = path.join(dir, 'assets');
  const files = fs.existsSync(assetsDir) ? walk(assetsDir) : [];
  const creditsJsonPaths = files.filter(f => /credits.*\.json$|credit.*\.json$/i.test(f));
  const creditsMd = files.find(f => /CREDITS\.md$/i.test(f));
  let creditRecords = [];
  const parseErrs = [];
  for (const cp of creditsJsonPaths) {
    try {
      const raw = fs.readFileSync(cp, 'utf8').replace(/^\uFEFF/, '');
      const j = JSON.parse(raw);
      const arr = Array.isArray(j) ? j : (Array.isArray(j.credits) ? j.credits : (Array.isArray(j.value) ? j.value : []));
      for (const rec of arr) if (rec && typeof rec === 'object') creditRecords.push({ file: rec.file || rec.filename || rec.name || '', artist: rec.artist || rec.creator || rec.author || '', license: rec.license || rec.licence || '', page: rec.page || rec.original || rec.source || '', src: cp.replace(ROOT, '') });
    } catch (e) { parseErrs.push(path.basename(cp) + ': ' + e.message.slice(0, 60)); }
  }
  const byName = new Map();
  for (const r of creditRecords) { const k = path.basename(String(r.file)); if (k) byName.set(k, r); }

  const usedImages = imgRefs.map(r => path.basename(r));
  const covered = usedImages.filter(n => byName.has(n));
  const uncovered = usedImages.filter(n => !byName.has(n));
  const noLicense = creditRecords.filter(r => !String(r.license).trim() || /见来源页/.test(String(r.license)));
  const noUrl = creditRecords.filter(r => !String(r.page).trim());
  const noArtist = creditRecords.filter(r => !String(r.artist).trim());

  out.push({
    dir: d,
    imagesOnDisk: files.filter(f => /\.(png|jpe?g|webp|avif|gif)$/i.test(f)).length,
    imagesReferenced: usedImages.length,
    usedList: usedImages,
    creditsJsonFiles: creditsJsonPaths.map(p => p.replace(ROOT, '')),
    hasCreditsMd: !!creditsMd,
    creditRecords: creditRecords.length,
    covered: covered.length,
    uncovered,
    noLicenseCount: noLicense.length,
    noUrlCount: noUrl.length,
    noArtistCount: noArtist.length,
    noUrlSamples: noUrl.slice(0, 5).map(r => path.basename(String(r.file)) + ' | ' + r.license),
    parseErrs,
    htmlMentionsCommons: /commons\.wikimedia|nasa\.gov|images-assets/i.test(html)
  });
}
fs.writeFileSync('D:/Web/style/deliverables/64-scheme-quality/licensing.json', JSON.stringify(out, null, 1));
const p = (s, n) => String(s).padEnd(n);
console.log(p('scheme', 37) + p('onDisk', 8) + p('used', 6) + p('recs', 6) + p('cov', 5) + p('noLic', 7) + p('noURL', 7) + p('noArtist', 9) + 'MD');
for (const r of out) console.log(p(r.dir.slice(0, 36), 37) + p(r.imagesOnDisk, 8) + p(r.imagesReferenced, 6) + p(r.creditRecords, 6) + p(r.covered, 5) + p(r.noLicenseCount, 7) + p(r.noUrlCount, 7) + p(r.noArtistCount, 9) + (r.hasCreditsMd ? 'Y' : '-'));
console.log('\n--- uncovered used images ---');
for (const r of out) if (r.uncovered.length) console.log(r.dir, JSON.stringify(r.uncovered));
console.log('\n--- parse errors ---');
for (const r of out) if (r.parseErrs.length) console.log(r.dir, r.parseErrs.join('; '));
