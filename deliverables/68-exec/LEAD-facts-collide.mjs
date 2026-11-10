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
await new Promise(r => server.listen(8431, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();

const check = async (label) => {
  const o = await page.eval(`(() => {
    const cells = [...document.querySelectorAll('.mast-facts > div')];
    const rows = cells.map(c => {
      const dt = c.querySelector('dt'), dd = c.querySelector('dd');
      const cr = c.getBoundingClientRect();
      const dr = dt.getBoundingClientRect(), er = dd.getBoundingClientRect();
      return {
        dt: dt.textContent.trim(), dd: dd.textContent.trim(),
        cellW: +cr.width.toFixed(1),
        dtOverflow: +(dt.scrollWidth - dr.width).toFixed(1),
        ddOverflow: +(dd.scrollWidth - er.width).toFixed(1),
        dtRight: +dr.right.toFixed(1), cellRight: +cr.right.toFixed(1),
      };
    });
    // 相邻单元格的文本是否相互入侵（后一个的 dt 左边 < 前一个的 dd 右边）
    let collide = 0;
    for (let i = 1; i < rows.length; i++) if (rows[i].dtRight < rows[i-1].cellRight - 1) collide++;
    // 检查实际有没有文字被裁
    const clipped = rows.filter(r => r.dtOverflow > 0.5 || r.ddOverflow > 0.5).map(r => r.dt + '/' + r.dd);
    return { rows, collide, clipped };
  })()`);
  console.log(`  [${label}]`);
  for (const r of o.rows) console.log(`     «${r.dt}»=«${r.dd}»  格宽=${r.cellW}  dt溢出=${r.dtOverflow} dd溢出=${r.ddOverflow}`);
  console.log(`     重叠=${o.collide}  被裁=${o.clipped.length ? o.clipped.join(',') : '无'}`);
  return o;
};

for (const [vw, vh] of [[1440, 900], [768, 1024], [390, 844]]) {
  await page.setViewport({ width: vw, height: vh, mobile: vw < 500 });
  await page.goto('http://127.0.0.1:8431/prototypes/_selection/index.html', { settleMs: 1400 });
  console.log(`\n=== ${vw}x${vh} ===`);
  await check('现状 26 / 30');
  // A/B：改回 26
  await page.eval(`document.getElementById('f-clean').textContent='26'`);
  await new Promise(r => setTimeout(r, 300));
  await check('改回 26');
}
await browser.close();
server.close();
