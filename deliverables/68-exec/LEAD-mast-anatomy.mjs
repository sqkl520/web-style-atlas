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
await new Promise(r => server.listen(8421, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();

for (const [vw, vh] of [[1440, 900], [768, 1024], [390, 844]]) {
  await page.setViewport({ width: vw, height: vh, mobile: vw < 500 });
  await page.goto('http://127.0.0.1:8421/prototypes/_selection/index.html', { settleMs: 1400 });

  const o = await page.eval(`(() => {
    const box = s => { const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return {h:+r.height.toFixed(1), top:+r.top.toFixed(1)}; };
    const fold = document.getElementById('mast-fold');
    const sg = document.getElementById('self-gate');
    return {
      mast: box('.mast'), mastId: box('.mast-id'), facts: box('.mast-facts'),
      foldOpen: fold? fold.open : null, foldH: fold? +fold.getBoundingClientRect().height.toFixed(1) : null,
      sgH: sg? +sg.getBoundingClientRect().height.toFixed(1) : null,
      sgDisplay: sg? getComputedStyle(sg).display : null,
      h1Lines: (()=>{const h=document.querySelector('.mast h1'); if(!h)return null; const lh=parseFloat(getComputedStyle(h).lineHeight); return Math.round(h.getBoundingClientRect().height/lh);})(),
      firstRowTop: +document.querySelector('li.row').getBoundingClientRect().top.toFixed(1),
    };
  })()`);
  console.log(`\n=== ${vw}x${vh} ===`);
  console.log(`  .mast 高=${o.mast?.h}  .mast-id=${o.mastId?.h}  .mast-facts=${o.facts?.h}`);
  console.log(`  mast-fold: open=${o.foldOpen} 高=${o.foldH}   self-gate 高=${o.sgH} display=${o.sgDisplay}`);
  console.log(`  h1 行数=${o.h1Lines}   首卡 top=${o.firstRowTop}`);

  // A/B：把 mast-fold 关掉，看页头能降多少
  await page.eval(`(() => { const f=document.getElementById('mast-fold'); if(f) f.open=false; })()`);
  await new Promise(r => setTimeout(r, 400));
  const closed = await page.eval(`(() => {
    const m=document.querySelector('.mast').getBoundingClientRect();
    return { mast:+m.height.toFixed(1), firstRowTop:+document.querySelector('li.row').getBoundingClientRect().top.toFixed(1) };
  })()`);
  console.log(`  → 折叠 mast-fold 后: .mast=${closed.mast}  首卡 top=${closed.firstRowTop}`);
  await page.eval(`(() => { const f=document.getElementById('mast-fold'); if(f) f.open=true; })()`);
  await new Promise(r => setTimeout(r, 250));
}
await browser.close();
server.close();
