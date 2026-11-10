import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const ROOT = 'D:/Web/style'; const PORT = 9769;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/prototypes/_selection/index.html'; const f = normalize(join(ROOT, p)); if (!f.startsWith(normalize(ROOT)) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; } res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(f)); });
await new Promise(r => server.listen(PORT, r));
const BASE = `http://127.0.0.1:${PORT}`;
const print = (k, v) => console.log('### ' + k + '\n' + JSON.stringify(v, null, 1));

{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/index.html`, { settleMs: 3000 });
  print('nearChipPressed', await p.eval(`(() => {
    document.querySelector('.scene-toggle').click();
    const near = document.querySelector('.scene-more .scene-chip');
    const g = (e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return { bg: cs.backgroundColor, color: cs.color, border: cs.border, font: cs.fontSize, w: Math.round(r.width), h: Math.round(r.height) }; };
    const before = g(near);
    near.click();
    const after = g(near);
    const direct = document.querySelector('#flt-scene .scene-chip');
    direct.click();
    const dp = g(direct);
    return { term: near.textContent.slice(0,10), pressedAttr: near.getAttribute('aria-pressed'), before, after,
      visualChanged: JSON.stringify(before) !== JSON.stringify(after),
      directPressed: dp, count: document.getElementById('count').textContent };
  })()`));
  await b.close();
}

{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/#S26`, { settleMs: 2500 });
  print('wizardLinkResult', await p.eval(`(() => ({ hash: location.hash, detailHidden: document.getElementById('detail').hidden, dNo: document.getElementById('d-no').textContent, activeEl: document.activeElement.tagName, scrollY: Math.round(scrollY) }))()`));
  await b.close();
}

{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/index.html#S07`, { settleMs: 3000 });
  print('rootIndexHash', await p.eval(`(() => ({ href: location.href, hash: location.hash, title: document.title, hasDetail: !!document.getElementById('detail'), bodyText: document.body.innerText.slice(0,120) }))()`));
  await b.close();
}
server.close();
