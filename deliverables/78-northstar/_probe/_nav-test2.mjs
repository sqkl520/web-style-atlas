/* 用 measure() 完全相同的服务器逻辑，单独测导航，把失败请求打出来。 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const abs = resolve(ROOT, 'prototypes/S01-red-wedge-broadsheet/index.html');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css;charset=utf-8',
  '.js': 'text/javascript;charset=utf-8', '.woff2': 'font/woff2', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml' };
const log = [];
const server = createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const p = resolve(ROOT, '.' + rel);
  if (!p.startsWith(ROOT)) { log.push(`403 ${rel}`); res.writeHead(403); res.end(); return; }
  try {
    const buf = await readFile(p);
    log.push(`200 ${rel}`);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(buf);
  } catch (e) {
    if (/\/favicon\.ico$/.test(rel)) { log.push(`204 ${rel}`); res.writeHead(204); res.end(); return; }
    log.push(`404 ${rel} (${e.code})`);
    res.writeHead(404); res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const relUrl = abs.slice(ROOT.length).replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });
const pg = await b.newPage();
await pg.setViewport({ width: 1440, height: 900 });
try {
  await pg.goto(`http://127.0.0.1:${port}${relUrl}`, { settleMs: 1500 });
  console.log('goto OK, title:', await pg.eval('document.title'));
} catch (e) { console.log('GOTO ERROR:', e.message); }
const bad = log.filter((l) => !l.startsWith('200'));
console.log('非 200 请求:', bad.length ? bad.join('\n') : '（无）');
await b.close(); server.close(); process.exit(0);
