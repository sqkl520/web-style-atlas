// 受控实验 2：跨 6 次独立 Chrome 启动，同一页面同一滚动位，各截 PNG + JPEG。
// 目的：定位抖动发生在「页面渲染」还是「合成/缩放」层。
import { Browser, sleep } from 'file:///D:/Web/style/prototypes/_build/vendor/cdp.mjs';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, extname } from 'node:path';
import { createServer } from 'node:http';

const OUT = 'deliverables/75-q2/_det/determinism/exp2';
mkdirSync(OUT, { recursive: true });
const sha = (b) => createHash('sha256').update(b).digest('hex');
const ROOT = 'D:/Web/style';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.js': 'text/javascript; charset=utf-8', '.otf': 'font/otf', '.ttf': 'font/ttf' };
const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  try {
    if (!statSync(p).isFile()) throw 0;
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(readFileSync(p));
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(8766, '127.0.0.1', r));

const pngs = [], jpgs = [];
for (let run = 0; run < 6; run++) {
  const browser = await Browser.launch({ width: 1600, height: 1000 });
  const page = await browser.newPage({ width: 768, height: 480, dsf: 1, mobile: false });
  await page.goto('http://127.0.0.1:8766/prototypes/S17-revenue-stamp-stub/index.html', { settleMs: 600 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(1400);
  await page.eval("window.scrollTo({ top: 480, behavior: 'instant' })").catch(() => {});
  await page.wheel(2);
  await sleep(650);
  await sleep(400);
  const png = Buffer.from(await page.screenshot({ format: 'png' }), 'base64');
  const jpg = Buffer.from(await page.screenshot({ format: 'jpeg', quality: 78 }), 'base64');
  pngs.push(png); jpgs.push(jpg);
  writeFileSync(join(OUT, `run${run}.png`), png);
  writeFileSync(join(OUT, `run${run}.jpg`), jpg);
  console.log(`launch ${run}: png ${sha(png).slice(0,16)} (${png.length}B)  jpg ${sha(jpg).slice(0,16)} (${jpg.length}B)`);
  await page.close();
  await browser.close();
}
await new Promise((r) => setTimeout(r, 500));
server.close();

console.log('\nPNG unique=', new Set(pngs.map(sha)).size, ' JPEG unique=', new Set(jpgs.map(sha)).size);
const bd = (x, y) => { if (x.length !== y.length) return `LEN ${x.length}/${y.length}`; let n = 0, f = -1, offs = []; for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) { n++; if (f < 0) f = i; if (offs.length < 12) offs.push(i); } return `不同=${n} 首差=${f}${n ? ' offs=' + offs.join(',') : ''}`; };
for (let i = 1; i < 6; i++) console.log(`run0 vs run${i}: PNG ${bd(pngs[0], pngs[i])} | JPEG ${bd(jpgs[0], jpgs[i])}`);
console.log('DONE');
process.exit(0);
