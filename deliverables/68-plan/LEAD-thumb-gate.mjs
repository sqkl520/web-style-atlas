// 实测 390 档缩略图的实际尺寸 vs 闸门阈值（width>=120 && height>=90 && area>=160*120=19200）
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
await new Promise(r => server.listen(8412, '127.0.0.1', r));

const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();

for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
  await page.setViewport({ width: w, height: h, mobile: w < 500 });
  await page.goto('http://127.0.0.1:8412/prototypes/_selection/index.html', { settleMs: 1500 });
  const out = await page.eval(`(() => {
    const all = [...document.querySelectorAll('img')];
    const rows = [];
    for (const el of all) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const vis = cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      const passGate = r.width >= 120 && r.height >= 90 && r.width * r.height >= 160 * 120;
      rows.push({ w: Math.round(r.width), h: Math.round(r.height), area: Math.round(r.width * r.height), vis, passGate, cls: (el.closest('.shot') ? 'shot' : el.className || el.parentElement?.className || '?').toString().slice(0, 28) });
    }
    // 只统计可见的
    const visRows = rows.filter(r => r.vis);
    return {
      total: rows.length,
      visible: visRows.length,
      passGate: visRows.filter(r => r.passGate).length,
      // 按尺寸分组
      groups: Object.entries(visRows.reduce((a, r) => { const k = r.w + 'x' + r.h; a[k] = (a[k] || 0) + 1; return a; }, {})),
      sample: visRows.slice(0, 4),
    };
  })()`);
  console.log(`\n=== ${w}x${h} ===`);
  console.log(`  img 总数 ${out.total} / 可见 ${out.visible} / 过闸门 ${out.passGate}`);
  console.log(`  尺寸分组: ${JSON.stringify(out.groups)}`);
  console.log(`  样本: ${JSON.stringify(out.sample)}`);
  console.log(`  闸门阈值: w>=120 && h>=90 && area>=19200`);
}
await browser.close();
server.close();
