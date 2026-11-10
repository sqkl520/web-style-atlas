// 裁决：375x812 / 360x640 到底有几张首屏完整卡？
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
await new Promise(r => server.listen(8541, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();

const VPS = [[360, 640], [375, 667], [375, 812], [390, 844], [414, 896], [768, 1024], [1024, 900], [1440, 900]];
const SORTS = ['n', 'gate'];

for (const [vw, vh] of VPS) {
  await page.setViewport({ width: vw, height: vh, mobile: vw < 700 });
  await page.goto('http://127.0.0.1:8541/prototypes/_selection/index.html', { settleMs: 1600 });

  const rows = [];
  for (const s of SORTS) {
    await page.eval(`(() => { const el=document.getElementById('sort'); if(!el)return; el.value=${JSON.stringify(s)}; el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await new Promise(r => setTimeout(r, 320));
    const o = await page.eval(`(() => {
      const cards=[...document.querySelectorAll('li.row')];
      let full=0; const avail = window.innerHeight;
      for(const c of cards){const b=c.getBoundingClientRect(); if(b.top>=0 && b.bottom<=avail) full++;}
      const f=cards[0]; const b=f?f.getBoundingClientRect():null;
      return { id:(f?.querySelector('.no')?.textContent||'').trim(), top:+b.top.toFixed(1), h:+b.height.toFixed(1), bottom:+b.bottom.toFixed(1), full, slack:+(avail-b.bottom).toFixed(1), vh:avail };
    })()`);
    rows.push({ sort: s, ...o });
  }
  const line = rows.map(r => `${r.sort}:${r.id} top=${r.top} h=${r.h} 底=${r.bottom} 余=${r.slack} 完整=${r.full}`).join(' | ');
  console.log(`${String(vw).padStart(4)}x${String(vh).padStart(3)}  ${line}`);
}
await browser.close();
server.close();
