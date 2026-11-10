import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'D:/Web/style';
const OUT = join(ROOT, 'deliverables/68-verify/shots');
mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = join(ROOT, u);
  if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(8430, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();

for (const [w, h, name] of [[1440, 900, 'desktop'], [768, 1024, 'tablet'], [390, 844, 'mobile']]) {
  await page.setViewport({ width: w, height: h, mobile: w < 500 });
  await page.goto('http://127.0.0.1:8430/prototypes/_selection/index.html', { settleMs: 1600 });
  const buf = await page.screenshot({ path: join(OUT, `selection-${name}-fold.jpg`), type: 'jpeg', quality: 82 });
  console.log(`已存 selection-${name}-fold.jpg`);
}
// 额外：390 档「闸门」排序（最紧的那一档）
await page.setViewport({ width: 390, height: 844, mobile: true });
await page.goto('http://127.0.0.1:8430/prototypes/_selection/index.html', { settleMs: 1500 });
await page.eval(`(() => { const el=document.getElementById('sort'); el.value='gate'; el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
await new Promise(r => setTimeout(r, 600));
await page.screenshot({ path: join(OUT, 'selection-mobile-gate-sort.jpg'), type: 'jpeg', quality: 82 });
console.log('已存 selection-mobile-gate-sort.jpg');
await browser.close();
server.close();
