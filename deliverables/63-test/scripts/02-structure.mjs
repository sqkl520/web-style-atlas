#!/usr/bin/env node
// 63-test 路 step 2: structural probe 鈥?what are the load-bearing blocks of each page?
// Serves the ORIGINAL prototypes read-only over a local port and prints, per case,
// the top-level block tree (tag + classes + rect), so representative elements can be
// chosen deliberately instead of guessed.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { createServer } from 'node:http';
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = resolve('D:/Web/style');
const PORT = 9611;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.avif': 'image/avif', '.txt': 'text/plain', '.woff': 'font/woff', '.otf': 'font/otf' };
const server = createServer((req, res) => {
  const f = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (f !== ROOT && !f.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
  let b; try { b = readFileSync(f); } catch { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(b);
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const CASES = ['S03-long-exposure-observatory', 'S05-pixel-cold-storage-console', 'S10-grid-versus-sheet',
  'S14-zero-g-launch-sequence', 'S15-fishery-floor-ledger', 'S18-phosphor-service-deck',
  'S20-plotter-soundfield', 'S21-interlocking-release-book', 'S29-wire-bound-safety-manual'];

const probe = () => {
  const rows = [];
  const walk = (el, depth) => {
    if (depth > 2) return;
    for (const ch of el.children) {
      const cs = getComputedStyle(ch);
      const r = ch.getBoundingClientRect();
      if (cs.display === 'none' || r.width < 4 || r.height < 4) continue;
      const cls = (typeof ch.className === 'string' ? ch.className.trim().split(/\s+/).join('.') : '');
      rows.push({
        d: depth, tag: ch.tagName.toLowerCase(), cls,
        top: Math.round(r.top + scrollY), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height),
        kids: ch.children.length,
      });
      walk(ch, depth + 1);
    }
  };
  walk(document.body, 0);
  return {
    title: document.title,
    docH: document.documentElement.scrollHeight,
    docW: document.documentElement.scrollWidth,
    rows: rows.slice(0, 90),
  };
};

const out = {};
const browser = await Browser.launch({ width: 1440, height: 900 });
try {
  for (const c of CASES) {
    const p = await browser.newPage({ width: 1440, height: 900 });
    await p.goto(`http://127.0.0.1:${PORT}/prototypes/${c}/index.html`, { settleMs: 1800 });
    const r = await p.eval(probe);
    out[c] = r;
    console.log('\n########## ' + c + '  docH=' + r.docH + ' docW=' + r.docW);
    for (const row of r.rows) {
      if (row.d > 1) continue;
      console.log('  '.repeat(row.d) + `${row.tag}${row.cls ? '.' + row.cls : ''}  [${row.left},${row.top} ${row.w}x${row.h}] kids=${row.kids}`);
    }
    await p.close();
  }
} finally { await browser.close(); server.close(); }
mkdirSync(join(ROOT, 'deliverables', '63-test', 'data'), { recursive: true });
writeFileSync(join(ROOT, 'deliverables', '63-test', 'data', 'structure.json'), JSON.stringify(out, null, 1));


