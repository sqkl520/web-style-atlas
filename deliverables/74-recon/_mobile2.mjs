import { readFileSync, readdirSync, existsSync } from 'node:fs';
const root = 'D:/Web/style/prototypes/';
const dirs = readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory() && /^S\d\d-/.test(d.name)).map(d => d.name).sort();
const out = [];
for (const d of dirs) {
  const p = root + d + '/style.css';
  if (!existsSync(p)) continue;
  const css = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = [...css.matchAll(/@media[^{]*(max-width:\s*(\d+)px)[^{]*\{([\s\S]*?)\n\}/g)];
  const narrow = blocks.filter(b => +b[2] <= 767);
  const hits = [];
  for (const b of narrow) {
    for (const m of b[3].matchAll(/grid-template-columns:\s*([^;}]+)/g)) {
      const g = m[1].trim();
      // count tracks properly
      const reps = [...g.matchAll(/repeat\(\s*(\d+)/g)].map(x => +x[1]);
      const tracks = reps.length ? Math.max(...reps)
        : g.split(/\s+(?![^(]*\))/).length;
      if (tracks >= 2 && !/^(minmax\(0,\s*1fr\)|1fr)$/.test(g.trim())) hits.push('grid:' + g.trim());
    }
    const cc = b[3].match(/column-count:\s*(\d+)/);
    if (cc && +cc[1] >= 2) hits.push('column-count:' + cc[1]);
  }
  out.push([d, narrow.length, hits]);
}
const bad = out.filter(o => o[2].length);
console.log('schemes with >=2 tracks below 768px:', bad.length, '/', out.length);
for (const o of bad) console.log(' ', o[0], '=>', o[2].join(' ; '));
