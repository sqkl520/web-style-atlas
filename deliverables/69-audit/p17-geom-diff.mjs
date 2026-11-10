// 量化实验 2 的像素差：在哪一屏、差多少、差在哪个矩形。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const BASE = resolve('D:/Web/style/deliverables/69-audit/exp2');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const server = createServer((req, res) => {
  try {
    let f = resolve(join(BASE, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!f.startsWith(BASE + sep)) { res.writeHead(403); return res.end(); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'content-length': statSync(f).size, 'cache-control': 'no-store' });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(8841, '127.0.0.1', r));
const browser = await Browser.launch({ width: 1440, height: 900 });

const geom = async (variant) => {
  const p = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
  await p.setViewport({ width: 1440, height: 900, mobile: false, dsf: 1 });
  await p.goto(`http://127.0.0.1:8841/${variant}/index.html`, { timeoutMs: 30000, settleMs: 600 });
  await p.eval('document.fonts.ready.then(() => true)');
  await sleep(1800);
  const r = await p.eval(`(() => {
    const items = [...document.querySelectorAll('.depth, .mono, td.mono')].map((el) => {
      const b = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return { t: (el.innerText || '').trim().slice(0, 10), x: Math.round(b.x * 10) / 10, y: Math.round((b.y + scrollY) * 10) / 10, w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10, fs: cs.fontSize, lh: cs.lineHeight, disp: cs.display, ff: cs.fontFamily.slice(0, 20) };
    });
    return { pageH: document.documentElement.scrollHeight, items };
  })()`);
  await p.close();
  return r;
};
const a = await geom('orig');
const b = await geom('wrapped');
await browser.close(); server.close();

console.log(`页面总高 orig=${a.pageH} wrapped=${b.pageH}  Δ=${b.pageH - a.pageH}`);
console.log(`元素数 orig=${a.items.length} wrapped=${b.items.length}`);
let diff = 0;
for (let i = 0; i < Math.min(a.items.length, b.items.length); i++) {
  const x = a.items[i], y = b.items[i];
  const same = x.t === y.t && x.x === y.x && x.y === y.y && x.w === y.w && x.h === y.h && x.fs === y.fs && x.lh === y.lh;
  if (!same) { diff++; if (diff <= 8) console.log(`  #${i} orig=${JSON.stringify(x)}\n      wrap=${JSON.stringify(y)}`); }
}
console.log(`\n几何不同的元素：${diff} / ${a.items.length}`);
