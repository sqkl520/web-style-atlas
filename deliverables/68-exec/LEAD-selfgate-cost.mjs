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
await new Promise(r => server.listen(8424, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();

const SORTS = ['n', 'fr', 'thr', 'gate', 'built'];
for (const [vw, vh] of [[1440, 900], [768, 1024], [390, 844]]) {
  await page.setViewport({ width: vw, height: vh, mobile: vw < 500 });
  await page.goto('http://127.0.0.1:8424/prototypes/_selection/index.html', { settleMs: 1400 });

  const m0 = await page.eval(`(() => ({
    mast: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1),
    firstRow: +document.querySelector('li.row').getBoundingClientRect().top.toFixed(1),
  }))()`);

  // 移除 self-gate 后
  const m1 = await page.eval(`(() => {
    const e=document.getElementById('self-gate'); if(e) e.remove();
    return {
      mast: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1),
      firstRow: +document.querySelector('li.row').getBoundingClientRect().top.toFixed(1),
    };
  })()`);
  await new Promise(r => setTimeout(r, 320));

  console.log(`\n=== ${vw}x${vh} ===`);
  console.log(`  有 self-gate : mast=${m0.mast}  首卡=${m0.firstRow}`);
  console.log(`  无 self-gate : mast=${m1.mast}  首卡=${m1.firstRow}`);
  console.log(`  → self-gate 的净代价: mast +${(m0.mast - m1.mast).toFixed(1)}px  首卡 +${(m0.firstRow - m1.firstRow).toFixed(1)}px`);

  // 五种排序的完整卡（现状）
  const rows = [];
  for (const s of SORTS) {
    await page.eval(`(() => { const el=document.getElementById('sort'); if(!el)return; el.value=${JSON.stringify(s)}; el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await new Promise(r => setTimeout(r, 230));
    const r = await page.eval(`(() => {
      const cards=[...document.querySelectorAll('li.row')]; let full=0;
      for(const c of cards){const b=c.getBoundingClientRect(); if(b.top>=0&&b.bottom<=window.innerHeight) full++;}
      const f=cards[0];
      return { id:(f?.querySelector('.no')?.textContent||'').trim(), top:+f.getBoundingClientRect().top.toFixed(1), h:+f.getBoundingClientRect().height.toFixed(1), full, slack:+ (window.innerHeight - f.getBoundingClientRect().bottom).toFixed(1) };
    })()`);
    rows.push(`${s}:${r.id} top=${r.top} h=${r.h} 完整=${r.full} 余量=${r.slack}`);
  }
  console.log(`  五档排序 → ${rows.join(' | ')}`);
}
await browser.close();
server.close();
