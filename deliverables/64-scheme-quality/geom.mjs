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

const [scheme, sel, widthArg] = process.argv.slice(2);
const width = +(widthArg || 1440);
const browser = await Browser.launch();
const page = await browser.newPage({ width, height: 900, dsf: 1 });
await page.goto(`${base}/prototypes/${scheme}/index.html`, { timeoutMs: 25000, settleMs: 700 });
await page.eval('document.fonts.ready.then(()=>true)').catch(() => {});
await sleep(1200);
const r = await page.eval((selector) => {
  const out = [];
  const els = [...document.querySelectorAll(selector)];
  for (const e of els.slice(0, 14)) {
    const b = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    out.push({ tag: e.tagName.toLowerCase(), cls: (e.className || '').toString().slice(0, 40), x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), right: +b.right.toFixed(1), text: (e.textContent || '').trim().slice(0, 28), pl: cs.paddingLeft, pr: cs.paddingRight, colCount: cs.columnCount, colGap: cs.columnGap, display: cs.display });
  }
  // also the doc width for overflow check
  return { items: out, docW: document.documentElement.scrollWidth, vw: innerWidth };
}, sel);
console.log(JSON.stringify(r, null, 1));
await page.close(); await browser.close(); server.close();
