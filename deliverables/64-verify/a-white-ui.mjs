// 确认 #FFFFFF 是否被渲染成用户可见的色块（详情面板「当前有效配色」+ 卡片色块）
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9688;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/prototypes/_selection/index.html';
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));
const URL = `http://127.0.0.1:${PORT}/prototypes/_selection/index.html`;

const b = await Browser.launch({ width: 1600, height: 1000 });
const p = await b.newPage({ width: 1600, height: 1000 });
await p.goto(URL, { settleMs: 2600 });

for (const id of ['S22', 'S27', 'S30']) {
  const r = await p.eval(async (sid) => {
    location.hash = '#' + sid;
    await new Promise((r) => setTimeout(r, 900));
    const body = document.getElementById('d-body');
    const txt = body ? body.innerText : '';
    const i = txt.indexOf('当前有效配色');
    const paletteLine = i >= 0 ? txt.slice(i, i + 90).split('\n').slice(0, 2).join(' | ') : null;
    // 卡片上的色块：找该案对应行
    const rows = Array.prototype.slice.call(document.querySelectorAll('.row'));
    let cardSwatches = null;
    for (const row of rows) {
      if ((row.textContent || '').indexOf(sid) >= 0) {
        const sws = Array.prototype.slice.call(row.querySelectorAll('[style*="background"]'));
        cardSwatches = sws.map((e) => getComputedStyle(e).backgroundColor).slice(0, 6);
        break;
      }
    }
    return { id: sid, paletteLine, cardSwatches };
  }, id);
  console.log(JSON.stringify(r));
  await p.screenshot({ path: `${ROOT}/deliverables/64-verify/shot-swatch-${id}.jpg`, quality: 70 });
}
await b.close();
server.close();
