import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/Web/style/prototypes';
const dirs = fs.readdirSync(ROOT).filter(d => /^S\d\d-/.test(d)).sort();

const h2 = (h) => {
  h = String(h).trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const L = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const [x, y] = [L(h2(a)), L(h2(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const shortHex = (h) => h.replace('#', '').toUpperCase();

const findings = [];
for (const d of dirs) {
  const dir = path.join(ROOT, d);
  const raw = fs.readFileSync(path.join(dir, 'style.css'), 'utf8');
  const cssNC = raw.replace(/\/\*[\s\S]*?\*\//g, '');

  // resolve :root vars
  const rootVars = {};
  const rootBlock = (cssNC.match(/:root\s*\{([\s\S]*?)\}/) || [])[1] || '';
  for (const m of rootBlock.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const v = m[2].trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(v)) rootVars[m[1]] = v;
  }
  const resolve = (v) => {
    if (!v) return null;
    v = v.trim();
    const mv = v.match(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/);
    if (mv) return rootVars[mv[1]] || (mv[2] ? mv[2].trim() : null);
    if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
    return null;
  };

  // scan rule blocks
  const blocks = [...cssNC.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  for (const b of blocks) {
    const sel = b[1].trim().replace(/\s+/g, ' ');
    const body = b[2];
    if (/:hover|::selection|:active|@keyframes/.test(sel)) continue;
    const bgm = body.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/);
    const fgm = body.match(/(?:^|;)\s*color\s*:\s*([^;]+)/);
    if (!bgm || !fgm) continue;
    const bg = resolve(bgm[1]);
    const fg = resolve(fgm[1]);
    if (!bg || !fg) continue;
    const r = ratio(fg, bg);
    if (r < 4.5) {
      // crude size detection
      const fsz = body.match(/font-size\s*:\s*([^;]+)/);
      findings.push({ dir: d, sel: sel.slice(0, 70), bg: shortHex(bg), fg: shortHex(fg), ratio: +r.toFixed(2), size: fsz ? fsz[1].trim() : '(inherit)', line: raw.slice(0, raw.indexOf(b[0])).split('\n').length });
    }
  }
}
fs.writeFileSync('D:/Web/style/deliverables/64-scheme-quality/css-contrast.json', JSON.stringify(findings, null, 1));
const p = (s, n) => String(s).padEnd(n);
console.log(p('case', 5) + p('selector', 42) + p('fg', 9) + p('bg', 9) + p('ratio', 7) + p('size', 12) + 'line');
for (const f of findings.sort((a, b) => a.ratio - b.ratio))
  console.log(p(f.dir.slice(0, 4), 5) + p(f.sel, 42) + p('#' + f.fg, 9) + p('#' + f.bg, 9) + p(f.ratio, 7) + p(f.size, 12) + f.line);
console.log('\ntotal:', findings.length);
