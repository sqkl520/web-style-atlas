#!/usr/bin/env node
// 63-test · step 11: S21 noise band.
// The original page's own docH ranged 4676-4728 across identical loads at 768px, which is
// the same size as the A/B difference. This establishes the repeatability band for both
// pages so the report can say whether the S21 delta exceeds measurement noise.
import { readFileSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { createServer } from 'node:http';
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = resolve('D:/Web/style');
const PORT = 9618;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = createServer((req, res) => {
  const f = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (f !== ROOT && !f.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
  let b; try { b = readFileSync(f); } catch { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(b);
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const C = 'S21-interlocking-release-book';
const measure = () => ({ docH: document.documentElement.scrollHeight, board: +document.querySelector('.board').getBoundingClientRect().height.toFixed(1), sheet: +document.querySelector('.sheet').getBoundingClientRect().height.toFixed(1) });

const browser = await Browser.launch({ width: 1440, height: 900 });
try {
  for (const w of [768, 390]) {
    const h = w === 768 ? 1024 : 844;
    for (const v of ['orig', 'swap']) {
      const vals = [];
      for (let i = 0; i < 6; i++) {
        const p = await browser.newPage({ width: w, height: h, mobile: w === 390 });
        const url = v === 'orig' ? `http://127.0.0.1:${PORT}/prototypes/${C}/index.html`
          : `http://127.0.0.1:${PORT}/deliverables/63-test/replica/${C}/index.swap.html`;
        await p.goto(url, { settleMs: 400 });
        await p.eval(`(async () => { await document.fonts.ready; await new Promise(r => setTimeout(r, 800)); })()`);
        vals.push(await p.eval(measure));
        await p.close();
      }
      const ds = vals.map((x) => x.docH);
      console.log(`${w} ${v.padEnd(5)} docH: ${ds.join(', ')}   min=${Math.min(...ds)} max=${Math.max(...ds)} band=${Math.max(...ds) - Math.min(...ds)}`);
      console.log(`        board: ${vals.map((x) => x.board).join(', ')}`);
      console.log(`        sheet: ${vals.map((x) => x.sheet).join(', ')}`);
    }
  }
} finally { await browser.close(); server.close(); }
