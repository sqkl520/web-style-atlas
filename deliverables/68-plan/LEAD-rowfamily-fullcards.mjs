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
await new Promise(r => server.listen(8415, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();

const SORTS = ['n', 'fr', 'thr', 'gate', 'built'];

async function measure(vw, vh, css) {
  await page.setViewport({ width: vw, height: vh, mobile: vw < 500 });
  await page.goto('http://127.0.0.1:8415/prototypes/_selection/index.html', { settleMs: 1300 });
  if (css) { await page.eval(`(() => { const s=document.createElement('style'); s.id='ab'; s.textContent=${JSON.stringify(css)}; document.head.appendChild(s); })()`); await new Promise(r => setTimeout(r, 300)); }
  const rows = [];
  for (const s of SORTS) {
    await page.eval(`(() => { const el=document.getElementById('sort'); if(!el) return; el.value=${JSON.stringify(s)}; el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await new Promise(r => setTimeout(r, 260));
    const r = await page.eval(`(() => {
      const cards=[...document.querySelectorAll('li.row')];
      let full=0; const avail=window.innerHeight;
      for(const c of cards){ const b=c.getBoundingClientRect(); if(b.top>=0 && b.bottom<=avail) full++; }
      const f=cards[0];
      return { firstId: f? (f.querySelector('.no')?.textContent||'').trim():'?', top: f? +f.getBoundingClientRect().top.toFixed(1):0, h: f? +f.getBoundingClientRect().height.toFixed(1):0, full };
    })()`);
    rows.push({ sort: s, ...r });
  }
  return rows;
}

for (const [vw, vh] of [[1440, 900], [390, 844]]) {
  const base = await measure(vw, vh, null);
  const fix15 = await measure(vw, vh, '.row-family{font-size:var(--s-15)!important}');
  const fix16 = await measure(vw, vh, '.row-family{font-size:var(--s-16)!important}');
  console.log(`\n=== ${vw}x${vh} 五种排序 × 首屏完整卡 ===`);
  console.log('  排序    | 基线(13px)            | 15px                  | 16px');
  for (let i = 0; i < SORTS.length; i++) {
    const f = (x) => `${x.firstId} top=${x.top} h=${x.h} 完整=${x.full}`;
    console.log(`  ${SORTS[i].padEnd(6)} | ${f(base[i]).padEnd(21)} | ${f(fix15[i]).padEnd(21)} | ${f(fix16[i])}`);
  }
}
await browser.close();
server.close();
