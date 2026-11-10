// Probe 3: replicate probe.mjs's body-size computation and list the actual blocks
// that make 13px the dominant "running text" size on the selection page.
// Uses the same cdp.mjs Browser the real gate uses, plus a throwaway static server.
import { createServer } from 'node:http';
import { resolve, join, extname, relative, sep } from 'node:path';
import { statSync, createReadStream } from 'node:fs';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const root = resolve('.');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = createServer((req, res) => {
  try {
    let f = resolve(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/prototypes/_selection/index.html`;

const browser = await Browser.launch();
for (const W of [1440, 390]) {
  const H = W === 1440 ? 900 : 844;
  const page = await browser.newPage({ width: W, height: H });
  await page.goto(url);
  await new Promise((r) => setTimeout(r, 1200));
  const res = await page.eval(`(() => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const bySize = new Map();
    let n;
    while ((n = walker.nextNode())) {
      const el = n.parentElement;
      if (!el) continue;
      const txt = (n.textContent || '').trim();
      if (txt.length < 40) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const size = Math.round(parseFloat(cs.fontSize));
      const inUI = !!el.closest('[data-ui]');
      const inCode = !!el.closest('pre,code,kbd,samp');
      if (size < 10 || size > 24 || inUI || inCode) continue;
      const k = size;
      const rec = bySize.get(k) || { size: k, chars: 0, samples: [] };
      rec.chars += txt.length;
      if (rec.samples.length < 4) rec.samples.push(txt.slice(0, 55) + '  [{' + el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0,2).join('.') : '') + '}]');
      bySize.set(k, rec);
      if (!out.some((o) => o.sel === el.tagName + '.' + el.className && o.size === size)) {
        out.push({ sel: el.tagName + '.' + (typeof el.className === 'string' ? el.className : ''), size, len: txt.length, inUI, sample: txt.slice(0, 50) });
      }
    }
    return { bySize: [...bySize.values()].sort((a,b)=>b.chars-a.chars), blocks: out };
  })()`);

  console.log(`\n########## width ${W} ##########`);
  console.log('ranked by char count (this is what sets body.size):');
  for (const r of res.bySize.slice(0, 6)) {
    console.log(`  ${String(r.size).padStart(3)}px  ${String(r.chars).padStart(6)} chars`);
    for (const s of r.samples) console.log(`           · ${s}`);
  }
  page.close?.();
}
await browser.close();
server.close();
