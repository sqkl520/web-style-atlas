#!/usr/bin/env node
// 63-test · step 9: determinism check.
// A/B comparison is worthless if the *same* page renders differently run to run. This
// loads the untouched original twice per viewport and reports the spread. Anything the
// harness reports must be larger than this noise floor to mean anything.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { createServer } from 'node:http';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = resolve('D:/Web/style');
const PORT = 9616;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
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
const VIEWPORTS = [{ w: 1440, h: 900 }, { w: 768, h: 1024 }, { w: 390, h: 844 }];

const warm = async (p) => p.eval(`(async () => {
  const H = document.documentElement.scrollHeight;
  for (let y = 0; y < H; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 20)); }
  window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 500));
})()`);
const probe = () => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, fonts: document.fonts.status, chars: (document.body.innerText || '').replace(/\s+/g, '').length });

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
try {
  for (const c of CASES) {
    out[c] = {};
    for (const vp of VIEWPORTS) {
      const reps = [];
      for (let i = 0; i < 3; i++) {
        const p = await browser.newPage({ width: vp.w, height: vp.h });
        await p.goto(`http://127.0.0.1:${PORT}/prototypes/${c}/index.html`, { settleMs: 2200 });
        await warm(p);
        await sleep(400);
        reps.push(await p.eval(probe));
        await p.close();
      }
      const hs = reps.map((r) => r.h);
      out[c][vp.w] = { hs, spread: Math.max(...hs) - Math.min(...hs), stable: Math.max(...hs) === Math.min(...hs), fonts: reps.map((r) => r.fonts) };
      console.log(`${c} @${vp.w}: docH ${hs.join(' / ')}  spread=${Math.max(...hs) - Math.min(...hs)}px  ${Math.max(...hs) === Math.min(...hs) ? 'STABLE' : 'UNSTABLE'}  fonts=${reps.map((r) => r.fonts).join(',')}`);
    }
  }
} finally { await browser.close(); server.close(); }
writeFileSync(join(ROOT, 'deliverables', '63-test', 'data', 'determinism.json'), JSON.stringify(out, null, 1));
const worst = Math.max(...Object.values(out).flatMap((v) => Object.values(v).map((x) => x.spread)));
console.log(`\nnoise floor: worst repeated-render docH spread = ${worst}px`);
