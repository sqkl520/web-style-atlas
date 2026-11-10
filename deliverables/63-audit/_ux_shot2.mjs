import http from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9630;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/prototypes/_selection/index.html';
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(PORT, r));
const out = 'D:/Web/style/deliverables/63-audit/shots/';
mkdirSync(out, { recursive: true });
const b = await Browser.launch({ width: 1440, height: 900 });

// clip: the scene chip block with more expanded
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/index.html`, { settleMs: 3000 });
await p.eval(`(()=>{[...document.querySelectorAll('button')].filter(x=>/还有 28/.test(x.textContent))[0].click(); return true;})()`);
await sleep(500);
const clip = await p.eval(`(()=>{const r=document.querySelector('.rail-block').getBoundingClientRect();const m=document.querySelector('.scene-more').getBoundingClientRect();return {x:Math.max(0,r.left-6),y:Math.max(0,r.top-6),width:Math.min(r.width+12,300),height:Math.min(r.height+400,860)};})()`);
await p.screenshot({ path: out + 'ux-chip-direct-vs-near.jpg', quality: 88, clip });
// 390 rail expanded
await p.close();
const p2 = await b.newPage({ width: 390, height: 844 });
await p2.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/index.html`, { settleMs: 3000 });
await p2.eval(`document.getElementById('rail-fold').open=true`);
await sleep(400);
await p2.screenshot({ path: out + 'ux-rail-390-open.jpg', quality: 82 });
await p2.close();
console.log('ok');
await b.close(); server.close();
