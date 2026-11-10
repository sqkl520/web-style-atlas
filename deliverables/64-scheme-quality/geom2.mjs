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
const width = +(process.argv[3] || 1440);
const browser = await Browser.launch();
const page = await browser.newPage({ width, height: 900, dsf: 1 });
await page.goto(`${base}/prototypes/${scheme}/index.html`, { timeoutMs: 25000, settleMs: 700 });
await page.eval('document.fonts.ready.then(()=>true)').catch(() => {});
await sleep(1500);

const r = await page.eval(() => {
  const round = (n) => +n.toFixed(1);
  const info = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { x: round(b.x), w: round(b.width), h: round(b.height), colCount: cs.columnCount, colGap: cs.columnGap, display: cs.display, overflow: cs.overflow };
  };
  const out = { toc: {}, columns: {}, overlap: [], colX: {} };
  for (const sel of ['.pages', '.page-recto', '.page-verso', '.page-recto .toc', '.page-verso .toc']) {
    out.toc[sel] = info(document.querySelector(sel));
  }
  // distinct left positions of li across both TOCs
  const xs = {};
  for (const li of document.querySelectorAll('.toc li')) {
    const b = li.getBoundingClientRect();
    const k = Math.round(b.x);
    xs[k] = (xs[k] || 0) + 1;
  }
  out.colX = xs;
  // detect horizontal overlap between adjacent li boxes on the same visual band
  const lis = [...document.querySelectorAll('.toc li')].map(li => { const b = li.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b2: b.bottom, text: li.textContent.trim().slice(0, 16) }; });
  for (let i = 0; i < lis.length; i++) for (let j = i + 1; j < lis.length; j++) {
    const a = lis[i], c = lis[j];
    if (a.r > c.l + 2 && c.r > a.l + 2 && a.b2 > c.t + 2 && c.b2 > a.t + 2) out.overlap.push([a.text, c.text]);
  }
  out.overlap = out.overlap.slice(0, 8);
  out.docW = document.documentElement.scrollWidth;
  out.vw = innerWidth;
  return out;
});
console.log(JSON.stringify(r, null, 1));
await page.close(); await browser.close(); server.close();
