// 验证 localStorage 在两种打开方式下的可用性 —— 这决定「零第三方使用信号」可不可行。
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = decodeURIComponent(new URL('../../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

const server = createServer(async (req, res) => {
  try {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel.endsWith('/')) rel += 'index.html';
    const p = join(ROOT, rel);
    const b = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(b);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));

const browser = await Browser.launch();
const pg = await browser.newPage();

const PROBE = `(function(){
  var r = { hasLS: false, writeOk: false, err: null, quota: null };
  try {
    r.hasLS = typeof localStorage !== 'undefined' && localStorage !== null;
    if (!r.hasLS) { r.err = 'localStorage 不存在'; return JSON.stringify(r); }
    localStorage.setItem('__probe__', 'x');
    r.writeOk = localStorage.getItem('__probe__') === 'x';
    localStorage.removeItem('__probe__');
    var big = 'x'.repeat(1024 * 100);
    var n = 0;
    try { while (n < 60) { localStorage.setItem('__q' + n, big); n++; } } catch (e) { r.quota = n * 100 + 'KB（写满后抛错）'; }
    for (var i = 0; i < n; i++) localStorage.removeItem('__q' + i);
    if (!r.quota) r.quota = '≥' + (n * 100) + 'KB';
  } catch (e) { r.err = String(e.name + ': ' + e.message).slice(0, 90); }
  return JSON.stringify(r);
})()`;

// A. http://
await pg.goto(`http://127.0.0.1:${server.address().port}/prototypes/_selection/`, { settleMs: 2000 });
console.log('http://   ', await pg.eval(PROBE));

// B. file://
const fileUrl = 'file:///' + join(ROOT, 'prototypes/_selection/index.html').replace(/\\/g, '/');
try {
  await pg.goto(fileUrl, { settleMs: 2500 });
  console.log('file://   ', await pg.eval(PROBE));
} catch (e) {
  console.log('file://    导航失败:', String(e.message).slice(0, 90));
}

await browser.close();
server.close();
