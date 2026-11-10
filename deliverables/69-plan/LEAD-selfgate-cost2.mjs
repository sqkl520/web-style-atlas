// 核算 #self-gate 的净成本，以及有没有更省的替代
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'D:/Web/style';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = join(ROOT, u);
  if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(8540, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();

for (const [vw, vh] of [[1440, 900], [768, 1024], [390, 844], [375, 812], [360, 640]]) {
  await page.setViewport({ width: vw, height: vh, mobile: vw < 700 });
  await page.goto('http://127.0.0.1:8540/prototypes/_selection/index.html', { settleMs: 1600 });

  const m = async () => page.eval(`(() => {
    const sg = document.getElementById('self-gate');
    const fold = document.getElementById('mast-fold');
    return {
      sgH: sg ? +sg.getBoundingClientRect().height.toFixed(1) : null,
      sgLines: sg ? Math.round(sg.getBoundingClientRect().height / parseFloat(getComputedStyle(sg).lineHeight)) : null,
      sgText: sg ? sg.textContent.trim() : null,
      sgOverflow: sg ? (sg.scrollWidth > sg.clientWidth + 1) : null,
      foldH: fold ? +fold.getBoundingClientRect().height.toFixed(1) : null,
      mastH: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1),
      firstTop: +document.querySelector('li.row').getBoundingClientRect().top.toFixed(1),
    };
  })()`);

  const now = await m();
  // A/B: 移除 self-gate
  await page.eval(`(() => { const e=document.getElementById('self-gate'); if(e) e.remove(); })()`);
  await new Promise(r => setTimeout(r, 300));
  const without = await m();
  await page.goto('http://127.0.0.1:8540/prototypes/_selection/index.html', { settleMs: 1400 });

  console.log(`\n=== ${vw}x${vh} ===`);
  console.log(`  现状: self-gate 高 ${now.sgH}px (${now.sgLines} 行, 溢出=${now.sgOverflow})  fold ${now.foldH}  mast ${now.mastH}  首卡 ${now.firstTop}`);
  console.log(`  无它: fold ${without.foldH}  mast ${without.mastH}  首卡 ${without.firstTop}`);
  console.log(`  → 净成本: mast +${(now.mastH - without.mastH).toFixed(1)}px  首卡 +${(now.firstTop - without.firstTop).toFixed(1)}px`);
}
await browser.close();
server.close();
