import { createServer } from 'node:http';
import { statSync, createReadStream } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { Browser, sleep } from './lib/cdp2.mjs';

const ROOT = resolve('D:/Web/style');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  try {
    let f = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!f.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const scheme = process.argv[2];
const browser = await Browser.launch();
const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
await page.goto(`${base}/prototypes/${scheme}/index.html`, { timeoutMs: 25000, settleMs: 700 });
await page.eval('document.fonts.ready.then(()=>true)').catch(() => {});
await sleep(1200);

const r = await page.eval(() => {
  const vis = (el) => { const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && b.width > 0 && b.height > 0; };
  const list = [...document.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')].filter(vis);
  const out = [];
  for (const el of list) {
    const before = getComputedStyle(el);
    const snap = (cs) => [cs.outlineStyle, cs.outlineWidth, cs.outlineColor, cs.boxShadow, cs.backgroundColor, cs.color, cs.textDecorationLine, cs.borderTopColor, cs.filter].join('|');
    const b = snap(before);
    el.focus();
    const after = getComputedStyle(el);
    const a = snap(after);
    el.blur();
    out.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 40), text: (el.textContent || '').trim().slice(0, 22), changed: a !== b, outlineBefore: before.outlineStyle + ' ' + before.outlineWidth, outlineAfter: after.outlineStyle + ' ' + after.outlineWidth });
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await page.close(); await browser.close(); server.close();
