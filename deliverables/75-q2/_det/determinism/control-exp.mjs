// 受控实验：同一页面同一滚动位，连续截 8 帧，同时存 PNG（无损）与 JPEG（有损）。
// 目的：分清「源像素在抖」与「JPEG 编码器在抖」。
import { Browser, sleep } from 'file:///D:/Web/style/prototypes/_build/vendor/cdp.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const OUT = 'deliverables/75-q2/_det/determinism/exp';
mkdirSync(OUT, { recursive: true });
const sha = (b) => createHash('sha256').update(b).digest('hex');

const URL = 'http://127.0.0.1:8765/prototypes/S17-revenue-stamp-stub/index.html';
// 复用 cdp 的 goto：需要 file 或 http。直接用 file:// 会因 ../_fonts 受限，改用极简静态服务
import { createServer } from 'node:http';
import { statSync } from 'node:fs';
import { extname } from 'node:path';

const ROOT = 'D:/Web/style';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.js': 'text/javascript; charset=utf-8',
  '.otf': 'font/otf', '.ttf': 'font/ttf' };
const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  try {
    if (!statSync(p).isFile()) throw 0;
    const b = readFileSync(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(b);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(8765, '127.0.0.1', r));
console.log('server up on 8765');

const browser = await Browser.launch({ width: 1600, height: 1000 });
const page = await browser.newPage({ width: 768, height: 480, dsf: 1, mobile: false });
await page.goto('http://127.0.0.1:8765/prototypes/S17-revenue-stamp-stub/index.html', { settleMs: 600 });
await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
await sleep(1400);

// 复刻 inspect.mjs 的滚动到第 1 屏
await page.eval("window.scrollTo({ top: 480, behavior: 'instant' })").catch(() => {});
await page.wheel(2);
await sleep(650);
await sleep(500);

const pngHashes = [], jpgHashes = [], pngBufs = [], jpgBufs = [];
for (let i = 0; i < 8; i++) {
  const png = Buffer.from(await page.screenshot({ format: 'png' }), 'base64');
  const jpg = Buffer.from(await page.screenshot({ format: 'jpeg', quality: 78 }), 'base64');
  pngBufs.push(png); jpgBufs.push(jpg);
  pngHashes.push(sha(png)); jpgHashes.push(sha(jpg));
  writeFileSync(join(OUT, `f${i}.png`), png);
  writeFileSync(join(OUT, `f${i}.jpg`), jpg);
  console.log(`frame ${i}  png ${sha(png).slice(0, 16)} (${png.length}B)  jpg ${sha(jpg).slice(0, 16)} (${jpg.length}B)`);
  await sleep(80);
}

console.log('\nPNG unique =', new Set(pngHashes).size, ' JPEG unique =', new Set(jpgHashes).size);

// 字节级：PNG 之间的差异
const byteDiff = (x, y) => { if (x.length !== y.length) return { len: true, n: 0, first: -1 }; let n = 0, f = -1; for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) { n++; if (f < 0) f = i; } return { len: false, n, first: f }; };
for (let i = 1; i < 8; i++) {
  const d = byteDiff(pngBufs[0], pngBufs[i]);
  const j = byteDiff(jpgBufs[0], jpgBufs[i]);
  console.log(`f0 vs f${i}: PNG ${d.len ? '长度不同' : `不同字节=${d.n} 首差=${d.first}`} | JPEG ${j.len ? '长度不同' : `不同字节=${j.n} 首差=${j.first}`}`);
}

await page.close();
await browser.close();
server.close();
console.log('\nDONE');
process.exit(0);
