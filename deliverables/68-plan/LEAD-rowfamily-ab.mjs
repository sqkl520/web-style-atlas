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
await new Promise(r => server.listen(8414, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();

for (const [w, h] of [[1440, 900], [390, 844]]) {
  await page.setViewport({ width: w, height: h, mobile: w < 500 });
  await page.goto('http://127.0.0.1:8414/prototypes/_selection/index.html', { settleMs: 1400 });

  const probe = async (label) => {
    const o = await page.eval(`(() => {
      const fam = [...document.querySelectorAll('.row-family')];
      const rows = [...document.querySelectorAll('li.row')];
      return {
        famCount: fam.length,
        famFirst: fam[0] ? {
          h: +fam[0].getBoundingClientRect().height.toFixed(1),
          fs: getComputedStyle(fam[0]).fontSize,
          lh: getComputedStyle(fam[0]).lineHeight,
          clamp: getComputedStyle(fam[0]).webkitLineClamp,
          scrollH: fam[0].scrollHeight,
          textLen: fam[0].textContent.trim().length,
        } : null,
        row0: rows[0] ? { h: +rows[0].getBoundingClientRect().height.toFixed(1), top: +rows[0].getBoundingClientRect().top.toFixed(1) } : null,
        docH: document.documentElement.scrollHeight,
      };
    })()`);
    console.log(`    [${label}] row-family h=${o.famFirst?.h} fs=${o.famFirst?.fs} lh=${o.famFirst?.lh} clamp=${o.famFirst?.clamp} scrollH=${o.famFirst?.scrollH} textLen=${o.famFirst?.textLen}`);
    console.log(`            首卡 h=${o.row0?.h} top=${o.row0?.top}  docH=${o.docH}`);
    return o;
  };

  console.log(`\n=== ${w}x${h} ===`);
  const base = await probe('基线 13px');

  // A/B：把 row-family 提到 15px
  await page.eval(`(() => { const s=document.createElement('style'); s.id='ab'; s.textContent='.row-family{font-size:var(--s-15)!important}'; document.head.appendChild(s); })()`);
  await new Promise(r => setTimeout(r, 350));
  const b15 = await probe('15px');
  await page.eval(`document.getElementById('ab').remove()`);

  // A/B：16px
  await page.eval(`(() => { const s=document.createElement('style'); s.id='ab2'; s.textContent='.row-family{font-size:var(--s-16)!important}'; document.head.appendChild(s); })()`);
  await new Promise(r => setTimeout(r, 350));
  const b16 = await probe('16px');
  await page.eval(`document.getElementById('ab2').remove()`);

  console.log(`    → 15px: 首卡高 ${base.row0?.h} → ${b15.row0?.h}（${(b15.row0?.h - base.row0?.h).toFixed(1)}）  docH ${base.docH} → ${b15.docH}`);
  console.log(`    → 16px: 首卡高 ${base.row0?.h} → ${b16.row0?.h}（${(b16.row0?.h - base.row0?.h).toFixed(1)}）  docH ${base.docH} → ${b16.docH}`);
}
await browser.close();
server.close();
