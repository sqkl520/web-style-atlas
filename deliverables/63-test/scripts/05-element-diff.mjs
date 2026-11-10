#!/usr/bin/env node
// 63-test · step 5: element-level diff.
// For every element (identified by a DOM path that is stable because tag structure is
// byte-identical between the twins), compare rect in orig vs swap. This localises each
// residual shift to the exact block that caused it, so the report can say "this block
// reflowed, and here is why" instead of "the page moved a bit".
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { createServer } from 'node:http';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = resolve('D:/Web/style');
const OUT = join(ROOT, 'deliverables', '63-test');
const PORT = 9613;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff', '.otf': 'font/otf', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.avif': 'image/avif', '.txt': 'text/plain' };
const server = createServer((req, res) => {
  const f = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (f !== ROOT && !f.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
  let b; try { b = readFileSync(f); } catch { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(b);
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}`;

const CASES = ['S03-long-exposure-observatory', 'S05-pixel-cold-storage-console', 'S10-grid-versus-sheet',
  'S14-zero-g-launch-sequence', 'S15-fishery-floor-ledger', 'S18-phosphor-service-deck',
  'S20-plotter-soundfield', 'S21-interlocking-release-book', 'S29-wire-bound-safety-manual'];
const VIEWPORTS = [{ w: 1440, h: 900 }, { w: 768, h: 1024 }, { w: 390, h: 844 }];

const snap = () => {
  const rows = [];
  const walk = (el, path) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none') return;
    const r = el.getBoundingClientRect();
    rows.push({
      p: path, t: Math.round((r.top + scrollY) * 10) / 10, l: Math.round(r.left * 10) / 10,
      w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
      tc: el.textContent.trim().length,
      own: [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('').length,
    });
    let i = 0;
    for (const ch of el.children) {
      const cls = typeof ch.className === 'string' && ch.className.trim() ? '.' + ch.className.trim().split(/\s+/).join('.') : '';
      walk(ch, `${path}>${ch.tagName.toLowerCase()}${cls}:nth${i++}`);
    }
  };
  walk(document.body, 'body');
  return rows;
};

const warm = async (p) => p.eval(`(async () => {
  const H = document.documentElement.scrollHeight;
  for (let y = 0; y < H; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 20)); }
  window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 500));
})()`);

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
try {
  for (const c of CASES) {
    out[c] = {};
    const snaps = {};
    for (const [v, url] of [['orig', `${BASE}/prototypes/${c}/index.html`], ['swap', `${BASE}/deliverables/63-test/replica/${c}/index.swap.html`]]) {
      const p = await browser.newPage({ width: 1440, height: 900 });
      await p.goto(url, { settleMs: 2200 });
      await warm(p);
      snaps[v] = {};
      for (const vp of VIEWPORTS) {
        await p.setViewport({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.w === 390 });
        await sleep(420);
        await p.eval('window.scrollTo(0,0)');
        await sleep(320);
        snaps[v][vp.w] = await p.eval(snap);
      }
      await p.close();
    }
    for (const vp of VIEWPORTS) {
      const a = snaps.orig[vp.w], b = snaps.swap[vp.w];
      const mapB = new Map(b.map((x) => [x.p, x]));
      const deltas = [];
      for (const x of a) {
        const y = mapB.get(x.p);
        if (!y) { deltas.push({ p: x.p, missing: true }); continue; }
        const dh = +(y.h - x.h).toFixed(1), dt = +(y.t - x.t).toFixed(1);
        if (Math.abs(dh) > 0.5 || Math.abs(dt) > 0.5) deltas.push({ p: x.p, dh, dt, ow: x.own, tw: y.own, h0: x.h, h1: y.h });
      }
      // blocks that changed their OWN height (the root causes, not the pushed-around ones)
      const self = deltas.filter((d) => !d.missing && Math.abs(d.dh) > 0.5)
        .sort((x, y) => Math.abs(y.dh) - Math.abs(x.dh)).slice(0, 12);
      // deepest / smallest self-changers are the real culprits
      const leaves = deltas.filter((d) => !d.missing && Math.abs(d.dh) > 0.5)
        .sort((x, y) => (a.length && 0) || (x.p.split('>').length - y.p.split('>').length) || Math.abs(y.dh) - Math.abs(x.dh))
        .filter((d) => d.p.split('>').length >= 3).slice(0, 10);
      out[c][vp.w] = { docH: { o: a.find((x) => x.p === 'body').h + 0, s: b.find((x) => x.p === 'body').h }, changed: deltas.length, top: self, leaves };
      console.log(`\n=== ${c} @${vp.w}  changedNodes=${deltas.length}`);
      for (const d of leaves) console.log(`   self ${d.p.slice(-88)}  h ${d.h0}->${d.h1} (${d.dh >= 0 ? '+' : ''}${d.dh})  ownText ${d.ow}->${d.tw}`);
    }
  }
} finally { await browser.close(); server.close(); }
mkdirSync(join(OUT, 'data'), { recursive: true });
writeFileSync(join(OUT, 'data', 'element-diff.json'), JSON.stringify(out, null, 1));
console.log('\nwrote data/element-diff.json');
