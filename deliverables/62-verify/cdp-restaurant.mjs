import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9592;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/prototypes/_selection/index.html';
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(PORT, r));
const URL = `http://127.0.0.1:${PORT}/prototypes/_selection/index.html`;

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(URL, { settleMs: 2600 });

const res = await p.eval(`(() => {
  const q = document.getElementById('q');
  q.value = '餐厅';
  q.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`);
await new Promise(r => setTimeout(r, 1200));

const detail = await p.eval(`(() => {
  const strip = document.getElementById('tpl-strip');
  const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
  const strips = ids.filter(i => /tpl|strip|template/i.test(i));
  const info = {};
  strips.forEach(i => { const e = document.getElementById(i); info[i] = { hidden: e.hidden, display: getComputedStyle(e).display, text: (e.innerText || '').slice(0, 260) }; });
  return {
    count: (document.getElementById('count') || {}).textContent,
    rows: document.querySelectorAll('.row').length,
    tplHidden: strip ? strip.hidden : 'no-strip',
    tplDisplay: strip ? getComputedStyle(strip).display : null,
    tplText: strip ? (strip.innerText || '') : null,
    relevantIds: info,
    bodyHasM02Card: /M02 暖调门店站/.test(document.body.innerText),
    bodyTextSnippet: document.body.innerText.slice(0, 700)
  };
})()`);
console.log(JSON.stringify(detail, null, 2));
await b.close(); server.close();
