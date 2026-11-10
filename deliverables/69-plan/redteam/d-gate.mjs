// D: adjudicate each of the 6 live FAILs. For each, find the exact CSS/HTML evidence and
// decide: real defect / design intent / gate false positive.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';

const ROOT = 'D:\\Web\\style\\prototypes';
const cases = {
  S07: { dir: 'S07-slate-ink-contents', fails: ['mono'] },
  S08: { dir: 'S08-amber-overprint-lightbox', fails: ['palette-terracotta', 'font-count'] },
  S13: { dir: 'S13-blind-debossed-dispatch', fails: ['mono', 'empty-screens'] },
  S21: { dir: 'S21-interlocking-release-book', fails: ['mono'] },
};

const out = {};
for (const [id, c] of Object.entries(cases)) {
  const css = readFileSync(join(ROOT, c.dir, 'style.css'), 'utf8');
  const html = readFileSync(join(ROOT, c.dir, 'index.html'), 'utf8');
  // font-family declarations, with selector
  const fams = [...css.matchAll(/([^{}]+)\{([^{}]*font-family\s*:[^{}]*)\}/g)].map((m) => ({
    sel: m[1].trim().replace(/\s+/g, ' ').slice(-80),
    decl: (m[2].match(/font-family\s*:([^;]+)/) || [])[1].trim(),
  }));
  const monoFams = fams.filter((f) => /mono|Courier|Mono/i.test(f.decl));
  // where is mono applied — body or only numerals?
  const bodyMono = fams.filter((f) => /(^|,)\s*(body|html|p|\.prose)\b/.test(f.sel) && /mono/i.test(f.decl));
  // terracotta / palette hexes
  const hexes = [...new Set((css.match(/#[0-9A-Fa-f]{6}\b/g) || []).map((h) => h.toUpperCase()))];
  // distinct font families
  const famNames = new Set();
  for (const f of fams) for (const n of f.decl.split(',')) {
    const t = n.trim().replace(/^["']|["']$/g, '');
    if (t && !/^(serif|sans-serif|monospace|system-ui|cursive|ui-|Georgia|Arial|Helvetica|Times|-apple-system)/i.test(t)) famNames.add(t);
  }
  out[id] = {
    dir: c.dir, fails: c.fails,
    fontDecls: fams.length, monoSelectors: monoFams, bodyMono,
    distinctFamilies: [...famNames], familyCount: famNames.size,
    hexCount: hexes.length, hexes: hexes.slice(0, 30),
  };
}
writeFileSync('D:\\Web\\style\\deliverables\\69-plan\\redteam\\d-evidence.json', JSON.stringify(out, null, 1));
for (const [id, v] of Object.entries(out)) {
  console.log('\n##### ' + id + '  fails=' + v.fails.join(','));
  console.log(' families(' + v.familyCount + '):', v.distinctFamilies.join(' | '));
  console.log(' mono selectors:', JSON.stringify(v.monoSelectors.slice(0, 6), null, 1));
  console.log(' bodyMono:', JSON.stringify(v.bodyMono));
  console.log(' hexes:', v.hexCount);
}
